const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '../db.json');

const connectDB = () => {
  try {
    if (!fs.existsSync(dbPath)) {
      const initialData = {
        users: [],
        posts: [],
        comments: []
      };
      fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2), 'utf8');
      console.log('Local JSON Database initialized at: ' + dbPath);
    } else {
      console.log('Local JSON Database connected at: ' + dbPath);
    }
  } catch (error) {
    console.error('Local Database Initialization Error:', error.message);
  }
};

const readAll = () => {
  try {
    if (!fs.existsSync(dbPath)) {
      return { users: [], posts: [], comments: [] };
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading from local database:', error.message);
    return { users: [], posts: [], comments: [] };
  }
};

const writeAll = (data) => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing to local database:', error.message);
  }
};

const generateId = () => {
  return crypto.randomBytes(12).toString('hex');
};

const isBcryptHash = (str) => {
  return typeof str === 'string' && str.length === 60 && str.startsWith('$2');
};

// --- Query Engine Helpers ---

const matches = (item, query) => {
  if (!query) return true;
  for (const key in query) {
    const val = query[key];
    if (val && typeof val === 'object' && '$ne' in val) {
      const itemVal = item[key];
      const neVal = val.$ne;
      if (itemVal === neVal || (itemVal && neVal && itemVal.toString() === neVal.toString())) {
        return false;
      }
    } else {
      const itemVal = item[key];
      if (itemVal === val) continue;
      if (itemVal && val && itemVal.toString() === val.toString()) continue;
      return false;
    }
  }
  return true;
};

const sortItems = (items, sortObj) => {
  if (!sortObj) return items;
  const keys = Object.keys(sortObj);
  return [...items].sort((a, b) => {
    for (const key of keys) {
      const dir = sortObj[key];
      let valA = a[key];
      let valB = b[key];
      
      if (valA instanceof Date) valA = valA.getTime();
      if (valB instanceof Date) valB = valB.getTime();
      
      if (typeof valA === 'string' && !isNaN(Date.parse(valA)) && key === 'createdAt') {
        valA = new Date(valA).getTime();
      }
      if (typeof valB === 'string' && !isNaN(Date.parse(valB)) && key === 'createdAt') {
        valB = new Date(valB).getTime();
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        const cmp = valA.localeCompare(valB);
        if (cmp !== 0) return dir === 1 ? cmp : -cmp;
      } else {
        if (valA < valB) return dir === 1 ? -1 : 1;
        if (valA > valB) return dir === 1 ? 1 : -1;
      }
    }
    return 0;
  });
};

const selectFields = (item, selectString, defaultExclusions = []) => {
  if (!item) return item;
  const result = { ...item };
  
  for (const field of defaultExclusions) {
    delete result[field];
  }

  if (!selectString) return result;

  const tokens = selectString.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return result;

  const exclusions = [];
  const inclusions = [];
  const additions = [];

  for (const token of tokens) {
    if (token.startsWith('-')) {
      exclusions.push(token.substring(1));
    } else if (token.startsWith('+')) {
      additions.push(token.substring(1));
    } else {
      inclusions.push(token);
    }
  }

  if (inclusions.length > 0) {
    const filtered = { _id: item._id };
    for (const inc of inclusions) {
      if (item[inc] !== undefined) {
        filtered[inc] = item[inc];
      }
    }
    for (const add of additions) {
      if (item[add] !== undefined) {
        filtered[add] = item[add];
      }
    }
    return filtered;
  } else {
    for (const add of additions) {
      if (item[add] !== undefined) {
        result[add] = item[add];
      }
    }
    for (const exc of exclusions) {
      delete result[exc];
    }
    return result;
  }
};

const populateField = (item, path, selectString, populateNested, allData) => {
  if (!item) return item;
  
  if (path === 'comments') {
    let comments = (allData.comments || []).filter(c => c.postId && c.postId.toString() === item._id.toString());
    comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    if (populateNested) {
      comments = comments.map(c => {
        const nestedPath = populateNested.path;
        const nestedSelect = populateNested.select;
        return populateField(c, nestedPath, nestedSelect, populateNested.populate, allData);
      });
    }
    
    item.comments = comments;
    return item;
  }

  const value = item[path];
  if (!value) return item;

  const users = allData.users || [];

  if (Array.isArray(value)) {
    item[path] = value.map(id => {
      const userObj = users.find(u => u._id.toString() === id.toString());
      return userObj ? selectFields(userObj, selectString, ['password']) : null;
    }).filter(Boolean);
  } else {
    const userObj = users.find(u => u._id.toString() === value.toString());
    item[path] = userObj ? selectFields(userObj, selectString, ['password']) : null;
  }
  return item;
};

// --- Base Document Class ---

class Document {
  constructor(data) {
    Object.assign(this, data);
  }

  get id() {
    return this._id ? this._id.toString() : undefined;
  }

  async save() {
    const collection = this.constructor.collection;
    const db = require('./db');
    const data = db.readAll();
    
    const idx = data[collection].findIndex(item => item._id.toString() === this._id.toString());
    let existing = {};
    if (idx !== -1) {
      existing = data[collection][idx];
    }

    const schema = this.constructor.schema || [];
    const updated = { ...existing, _id: this._id };
    
    if (this.createdAt) {
      updated.createdAt = this.createdAt;
    } else if (existing.createdAt) {
      updated.createdAt = existing.createdAt;
    } else {
      updated.createdAt = new Date().toISOString();
    }

    for (const key of schema) {
      if (this[key] !== undefined) {
        updated[key] = this[key];
      }
    }

    // Auto-hash password for User class
    if (collection === 'users') {
      if (updated.password && !isBcryptHash(updated.password)) {
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        updated.password = await bcrypt.hash(updated.password, salt);
      }
    }

    if (idx !== -1) {
      data[collection][idx] = updated;
    } else {
      data[collection].push(updated);
    }
    
    db.writeAll(data);
    Object.assign(this, updated);
    return this;
  }

  static find(query) {
    return new Query(this, this.collection, query, false);
  }

  static findOne(query) {
    return new Query(this, this.collection, query, true);
  }

  static findById(id) {
    return new Query(this, this.collection, { _id: id }, true);
  }

  static async create(docData) {
    const db = require('./db');
    const id = db.generateId();
    const now = new Date().toISOString();
    
    const defaultDoc = { _id: id, createdAt: now };
    
    if (this.collection === 'users') {
      Object.assign(defaultDoc, {
        followers: [],
        following: [],
        badges: [],
        bio: '',
        skills: []
      });
    } else if (this.collection === 'posts') {
      Object.assign(defaultDoc, {
        likes: [],
        resources: { pdfLink: '', githubRepo: '', codingResource: '' }
      });
    }
    
    const doc = new this(Object.assign(defaultDoc, docData));
    await doc.save();
    return doc;
  }

  static async findByIdAndDelete(id) {
    const db = require('./db');
    const data = db.readAll();
    const idx = data[this.collection].findIndex(item => item._id.toString() === id.toString());
    if (idx !== -1) {
      const deleted = data[this.collection].splice(idx, 1)[0];
      db.writeAll(data);
      return new this(deleted);
    }
    return null;
  }

  static async deleteMany(query) {
    const db = require('./db');
    const data = db.readAll();
    const originalLength = data[this.collection].length;
    data[this.collection] = data[this.collection].filter(item => !matches(item, query));
    db.writeAll(data);
    return { deletedCount: originalLength - data[this.collection].length };
  }

  static async countDocuments(query) {
    const db = require('./db');
    const data = db.readAll();
    return data[this.collection].filter(item => matches(item, query)).length;
  }
}

// --- Query Builder Class ---

class Query {
  constructor(modelClass, collection, filter, isSingle) {
    this.modelClass = modelClass;
    this.collection = collection;
    this.filter = filter;
    this.isSingle = isSingle;
    this._select = null;
    this._sort = null;
    this._populates = [];
  }

  select(fields) {
    this._select = fields;
    return this;
  }

  sort(sortObj) {
    this._sort = sortObj;
    return this;
  }

  populate(options, select) {
    if (typeof options === 'string') {
      this._populates.push({ path: options, select });
    } else if (typeof options === 'object') {
      this._populates.push(options);
    }
    return this;
  }

  async execute() {
    const db = require('./db');
    const allData = db.readAll();
    let rawItems = allData[this.collection] || [];

    if (this.isSingle) {
      const rawItem = rawItems.find(item => matches(item, this.filter));
      if (!rawItem) return null;
      
      let doc = new this.modelClass(rawItem);
      doc = await this._runPopulateOnDoc(doc, allData);
      
      const defaultExcl = this.collection === 'users' ? ['password'] : [];
      const plainObj = selectFields(doc, this._select, defaultExcl);
      
      return new this.modelClass(plainObj);
    } else {
      let filtered = rawItems.filter(item => matches(item, this.filter));
      filtered = sortItems(filtered, this._sort);

      let docs = filtered.map(item => new this.modelClass(item));

      for (let i = 0; i < docs.length; i++) {
        docs[i] = await this._runPopulateOnDoc(docs[i], allData);
      }

      const defaultExcl = this.collection === 'users' ? ['password'] : [];
      docs = docs.map(doc => {
        const plainObj = selectFields(doc, this._select, defaultExcl);
        return new this.modelClass(plainObj);
      });

      return docs;
    }
  }

  async _runPopulateOnDoc(doc, allData) {
    for (const pop of this._populates) {
      doc = populateField(doc, pop.path, pop.select, pop.populate, allData);
    }
    return doc;
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

module.exports = {
  connectDB,
  readAll,
  writeAll,
  generateId,
  Document,
  Query
};
