# CampusConnect 🎓

CampusConnect is a premium, full-stack student community platform designed for students to share study updates, coding achievements, project repositories, PDF notes, and learning resources while interacting with peers and earning achievement badges.

---

## Technical Stack

* **Frontend:** HTML5, CSS3 (Glassmorphism Indigo Dark Theme), Vanilla JavaScript
* **Backend:** Node.js, Express.js
* **Database:** MongoDB with Mongoose
* **Authentication:** JWT (JSON Web Tokens), bcryptjs

---

## Features

1. **User Authentication:** Sign up, log in, secure password hashing, and token-based state authorization.
2. **User Profiles:** Fully editable profiles showing name, custom avatar seeds, college name, bio details, skills list, follower/following statistics, and unlocked achievements.
3. **Home Feed:** View updates from peers, create new posts with text and optional media, edit own posts inline, and delete own posts.
4. **Resource Attachments:** Post notes, GitHub repositories, and coding resource URLs, making them accessible via the Resources Hub.
5. **Like & Follow Systems:** Express support by liking updates and following fellow students.
6. **Comments Section:** Thread comments under updates to collaborate or provide feedback.
7. **Achievement Badges:** Triggers an automatic check upon posting, commenting, or receiving likes to award achievement badges with real-time UI celebrations.

---

## Badges Rules Engine

CampusConnect rewards community engagement dynamically:

1. **First Post (`first-post`):** Awarded when a student publishes their first update.
2. **Resource Guru (`resource-guru`):** Awarded when a student attaches at least 3 resource links (PDFs, GitHub repos, or external links) across their posts.
3. **10 Likes Received (`ten-likes`):** Awarded when the sum of likes received across all updates published by the student reaches 10 or more.
4. **Top Contributor (`top-contributor`):** Awarded when a student publishes at least 5 posts and writes at least 10 comments in total.

---

## Getting Started

### Prerequisites
* **Node.js** installed on your system.
* **MongoDB** (local community server running at `mongodb://localhost:27017` or a MongoDB Atlas URI link).

### Setup Instructions

1. Clone or navigate to the project directory:
   ```bash
   cd c:\Users\Public\OneDrive\CampusConnect
   ```

2. Initialize and configure the Environment file:
   Make sure a `.env` file exists in the root folder with the following variables:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/campusconnect
   JWT_SECRET=supersecretcampusconnectkey123!
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. View the App:
   Open your browser and navigate to `http://localhost:5000`.

---

## API Documentation

### Auth Router (`/api/auth`)
* `POST /register` - Register a new student.
* `POST /login` - Login to account.
* `GET /me` - Get active session profile (JWT protected).

### Users Router (`/api/users`)
* `GET /` - Explore registered students list.
* `GET /:id` - Get specific profile by ID.
* `PUT /profile` - Update own bio, skills, college name, or avatar.
* `POST /:id/follow` - Toggle follow/unfollow status.

### Posts Router (`/api/posts`)
* `GET /` - Retrieve the community home feed.
* `POST /` - Create a post (optionally attach PDF, Git, or resource URLs).
* `GET /:id` - Get post details.
* `PUT /:id` - Edit own post content and resource links.
* `DELETE /:id` - Delete own post.
* `POST /:id/like` - Toggle like/unlike.

### Comments Router (`/api/comments`)
* `POST /` - Add a comment under a post.
* `DELETE /:id` - Delete own comment.
