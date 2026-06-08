/**
 * CampusConnect SPA Application Engine
 * Manages views, routing, auth state, and interactive event listeners.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Global Application State
  let currentUser = null;
  let currentActiveView = 'feed';
  let viewParams = {};

  // Avatar Options Gallery List
  const AVATAR_PRESETS = [
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Robo',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Lorelei',
    'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Joy',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Ava',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=Pixel',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Scooter',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Sparky',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Maya',
    'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cool',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=Hero'
  ];

  // Helper to render presets inside the gallery grid
  const renderAvatarPresets = () => {
    const grid = document.getElementById('avatar-presets-grid');
    if (!grid) return;
    grid.innerHTML = AVATAR_PRESETS.map((url, index) => `
      <div class="avatar-preset-item" data-avatar-url="${url}" id="preset-${index}">
        <img src="${url}" alt="Preset ${index + 1}">
      </div>
    `).join('');

    // Bind click selectors
    grid.querySelectorAll('.avatar-preset-item').forEach(item => {
      item.addEventListener('click', () => {
        grid.querySelectorAll('.avatar-preset-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        document.getElementById('edit-profile-avatar').value = item.getAttribute('data-avatar-url');
      });
    });
  };

  // DOM Elements - Layouts
  const authenticatedLayout = document.getElementById('authenticated-layout');
  const unauthenticatedLayout = document.getElementById('unauthenticated-layout');
  const mobileNavBar = document.getElementById('mobile-nav-bar');

  // DOM Elements - Views
  const views = {
    feed: document.getElementById('view-feed'),
    explore: document.getElementById('view-explore'),
    resources: document.getElementById('view-resources'),
    profile: document.getElementById('view-profile'),
    editProfile: document.getElementById('view-edit-profile'),
    postDetails: document.getElementById('view-post-details'),
  };

  // Auth Forms
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginAlertError = document.getElementById('login-alert-error');
  const registerAlertError = document.getElementById('register-alert-error');

  // Create Post
  const createPostForm = document.getElementById('create-post-form');
  const btnAttachmentToggle = document.getElementById('btn-attachment-toggle');
  const attachmentsFields = document.getElementById('attachments-fields');
  const postContentInput = document.getElementById('post-content-input');
  const postCharCount = document.getElementById('post-char-count');

  // Edit Profile Form
  const editProfileForm = document.getElementById('edit-profile-form');
  const editProfileBio = document.getElementById('edit-profile-bio');
  const editBioCharCount = document.getElementById('edit-bio-char-count');

  // Initialization: Check Auth State
  const initApp = async () => {
    const token = localStorage.getItem('token');
    const cachedUser = localStorage.getItem('user');

    // Populate invite share link input
    const inviteLinkEl = document.getElementById('invite-share-link');
    if (inviteLinkEl) {
      inviteLinkEl.value = window.location.origin;
    }

    if (token && cachedUser) {
      currentUser = JSON.parse(cachedUser);
      updateUserWidgets();
      showAuthenticatedState();
      
      // Fetch fresh profile state in background
      API.getMe().then(res => {
        if (res.success) {
          currentUser = res.user;
          updateUserWidgets();
        } else {
          // Token expired or invalid
          handleLogout();
        }
      });

      // Default view
      navigateTo('feed');
    } else {
      showUnauthenticatedState();
    }
  };

  const showAuthenticatedState = () => {
    unauthenticatedLayout.classList.add('hidden');
    authenticatedLayout.classList.remove('hidden');
    if (window.innerWidth <= 900) {
      mobileNavBar.classList.remove('hidden');
    }
  };

  const showUnauthenticatedState = () => {
    authenticatedLayout.classList.add('hidden');
    mobileNavBar.classList.add('hidden');
    unauthenticatedLayout.classList.remove('hidden');
    showAuthCard('login');
  };

  const showAuthCard = (type) => {
    if (type === 'login') {
      document.getElementById('view-login').classList.remove('hidden');
      document.getElementById('view-register').classList.add('hidden');
    } else {
      document.getElementById('view-login').classList.add('hidden');
      document.getElementById('view-register').classList.remove('hidden');
    }
  };

  // Updates User info shown in Sidebar & Right Quick widget
  const updateUserWidgets = () => {
    if (!currentUser) return;

    // Sidebar Widget
    const sidebarWidget = document.getElementById('sidebar-user-card');
    if (sidebarWidget) {
      sidebarWidget.innerHTML = `
        <img src="${currentUser.profilePicture || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + encodeURIComponent(currentUser.name)}" alt="" class="avatar-sm">
        <div class="sidebar-user-info">
          <span class="user-name">${currentUser.name}</span>
          <span class="user-college">${currentUser.college}</span>
        </div>
      `;
    }

    // Right Quick Widget
    const rightWidget = document.getElementById('user-quick-widget');
    if (rightWidget) {
      // Unlocked Badges Icons
      let badgesHtml = '';
      if (currentUser.badges && currentUser.badges.length > 0) {
        badgesHtml = currentUser.badges.map(b => `
          <i class="fa-solid ${UI.BADGE_META[b]?.icon || 'fa-award'} ${UI.BADGE_META[b]?.class || ''}" 
             title="${UI.BADGE_META[b]?.name}"
             style="font-size: 16px; margin: 0 4px;"></i>
        `).join('');
      } else {
        badgesHtml = '<span style="font-size:0.75rem; color:var(--color-text-muted);">No badges earned yet. Post resources to unlock!</span>';
      }

      rightWidget.innerHTML = `
        <img src="${currentUser.profilePicture || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + encodeURIComponent(currentUser.name)}" alt="" class="avatar-md student-profile-trigger" data-user-id="${currentUser._id}" style="cursor:pointer;">
        <div class="widget-user-name student-profile-trigger" data-user-id="${currentUser._id}" style="cursor:pointer;">${currentUser.name}</div>
        <div class="widget-user-college">${currentUser.college}</div>
        
        <div class="widget-stats">
          <div class="stat-item">
            <span class="stat-val">${currentUser.followersCount || 0}</span>
            <span class="stat-lbl">Followers</span>
          </div>
          <div class="stat-item">
            <span class="stat-val">${currentUser.followingCount || 0}</span>
            <span class="stat-lbl">Following</span>
          </div>
        </div>
        
        <div class="widget-badges">
          ${badgesHtml}
        </div>
      `;
    }

    // Update avatar placeholders on the page (e.g. create post placeholder)
    const placeholders = document.querySelectorAll('.user-avatar-placeholder');
    placeholders.forEach(img => {
      img.src = currentUser.profilePicture || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + encodeURIComponent(currentUser.name);
    });
  };

  // Navigations Routing
  const navigateTo = (viewName, params = {}) => {
    currentActiveView = viewName;
    viewParams = params;

    // Toggle active view elements
    Object.keys(views).forEach(key => {
      if (key === viewName) {
        views[key].classList.remove('hidden');
      } else {
        views[key].classList.add('hidden');
      }
    });

    // Update Sidebar Navigation Indicators
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update Mobile Nav Indicators
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Trigger View Loading Functions
    switch (viewName) {
      case 'feed':
        loadFeed();
        break;
      case 'explore':
        loadExplore();
        break;
      case 'resources':
        loadResourcesHub();
        break;
      case 'profile':
        loadUserProfile(params.userId || currentUser._id);
        break;
      case 'editProfile':
        prefillEditProfile();
        break;
    }
    
    // Scroll to top of main viewport
    document.querySelector('.main-content').scrollTop = 0;
  };

  // View Loader: Feed
  const loadFeed = async () => {
    const listContainer = document.getElementById('feed-posts-list');
    listContainer.innerHTML = `
      <div class="loading-state">
        <i class="fa-solid fa-spinner fa-spin loading-spinner"></i>
        <p>Fetching community feed...</p>
      </div>
    `;

    const res = await API.getPosts();
    if (res.success && res.posts) {
      if (res.posts.length === 0) {
        listContainer.innerHTML = `
          <div class="no-items-state" style="padding: 4rem 2rem;">
            <i class="fa-solid fa-graduation-cap"></i>
            <p>Welcome to CampusConnect! Be the first to share a post above.</p>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = res.posts.map(post => UI.renderPostCard(post, currentUser._id)).join('');
    } else {
      listContainer.innerHTML = `
        <div class="alert alert-error">
          Error loading feed: ${res.message || 'Server connection failed.'}
        </div>
      `;
    }
  };

  // View Loader: Explore Users
  const loadExplore = async () => {
    const exploreContainer = document.getElementById('explore-users-list');
    exploreContainer.innerHTML = `
      <div class="loading-state">
        <i class="fa-solid fa-spinner fa-spin loading-spinner"></i>
        <p>Exploring student listings...</p>
      </div>
    `;

    const res = await API.getAllUsers();
    if (res.success && res.users) {
      if (res.users.length === 0) {
        exploreContainer.innerHTML = `
          <div class="no-items-state" style="grid-column: 1/-1;">
            <i class="fa-solid fa-users-slash"></i>
            <p>No other students have registered on this campus yet.</p>
            <button class="btn btn-accent btn-copy-invite-explore" style="margin-top: 1rem;">
              <i class="fa-solid fa-paper-plane"></i> Invite Classmates
            </button>
          </div>
        `;
        return;
      }

      exploreContainer.innerHTML = res.users.map(user => UI.renderExploreCard(user, currentUser._id)).join('');
    } else {
      exploreContainer.innerHTML = `
        <div class="alert alert-error" style="grid-column: 1/-1;">
          Error searching students: ${res.message}
        </div>
      `;
    }
  };

  // View Loader: Resources Hub
  const loadResourcesHub = async () => {
    const resourcesContainer = document.getElementById('resources-hub-list');
    resourcesContainer.innerHTML = `
      <div class="loading-state">
        <i class="fa-solid fa-spinner fa-spin loading-spinner"></i>
        <p>Loading files and links...</p>
      </div>
    `;

    const res = await API.getPosts();
    if (res.success && res.posts) {
      // Filter posts containing at least one attachment link
      const resourcePosts = res.posts.filter(p => {
        return p.resources && (p.resources.pdfLink || p.resources.githubRepo || p.resources.codingResource);
      });

      if (resourcePosts.length === 0) {
        resourcesContainer.innerHTML = `
          <div class="no-items-state" style="padding: 4rem 2rem;">
            <i class="fa-solid fa-book-open"></i>
            <p>No resource files or repos shared yet. Attach a PDF, Git repo, or URL to your next post!</p>
          </div>
        `;
        return;
      }

      resourcesContainer.innerHTML = resourcePosts.map(post => UI.renderResourceHubItem(post)).join('');
    } else {
      resourcesContainer.innerHTML = `
        <div class="alert alert-error">
          Error loading resources: ${res.message}
        </div>
      `;
    }
  };

  // View Loader: Single User Detailed Profile
  const loadUserProfile = async (userId) => {
    const profileContainer = document.getElementById('view-profile');
    profileContainer.innerHTML = `
      <div class="loading-state">
        <i class="fa-solid fa-spinner fa-spin loading-spinner"></i>
        <p>Loading student profile...</p>
      </div>
    `;

    const res = await API.getUserProfile(userId);
    if (res.success && res.user) {
      profileContainer.innerHTML = UI.renderProfile(res.user, res.posts, currentUser._id);
    } else {
      profileContainer.innerHTML = `
        <div class="back-nav">
          <button class="btn-back btn-back-to-feed"><i class="fa-solid fa-arrow-left"></i> Back to feed</button>
        </div>
        <div class="alert alert-error">
          Failed to fetch profile: ${res.message}
        </div>
      `;
    }
  };

  // View Loader: Edit Profile prefill
  const prefillEditProfile = () => {
    if (!currentUser) return;
    document.getElementById('edit-profile-name').value = currentUser.name || '';
    document.getElementById('edit-profile-college').value = currentUser.college || '';
    
    // Reset file upload states
    const fileInput = document.getElementById('edit-profile-file');
    if (fileInput) fileInput.value = '';
    const fileNameSpan = document.getElementById('upload-file-name');
    if (fileNameSpan) fileNameSpan.textContent = 'No file selected';

    // Render presets first
    renderAvatarPresets();

    const avatarInput = document.getElementById('edit-profile-avatar');
    const userPhoto = currentUser.profilePicture || '';
    avatarInput.value = userPhoto;

    // Check if user photo matches any preset
    const grid = document.getElementById('avatar-presets-grid');
    if (grid) {
      grid.querySelectorAll('.avatar-preset-item').forEach(item => {
        if (item.getAttribute('data-avatar-url') === userPhoto) {
          item.classList.add('selected');
        } else {
          item.classList.remove('selected');
        }
      });
    }

    // Bind custom URL typing listener
    avatarInput.addEventListener('input', () => {
      // If user types custom text, deselect all presets
      if (grid) {
        grid.querySelectorAll('.avatar-preset-item').forEach(i => i.classList.remove('selected'));
      }
    });

    document.getElementById('edit-profile-bio').value = currentUser.bio || '';
    document.getElementById('edit-profile-skills').value = (currentUser.skills || []).join(', ');

    // Character counter sync
    const bioText = currentUser.bio || '';
    editProfileBio.value = bioText;
    editBioCharCount.textContent = `${bioText.length}/200`;
  };

  // Check new badges and show congratulations
  const checkNewBadges = (newBadges) => {
    if (Array.isArray(newBadges) && newBadges.length > 0) {
      newBadges.forEach(badgeCode => {
        UI.showBadgeToast(badgeCode);
      });
      // Update quick info widget to reflect newly gained badges
      API.getMe().then(res => {
        if (res.success) {
          currentUser = res.user;
          updateUserWidgets();
        }
      });
    }
  };

  // ==========================================
  // EVENT LISTENERS & SUBMISSIONS
  // ==========================================

  // Auth: Login Form
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginAlertError.classList.add('hidden');
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const res = await API.login(email, password);
    if (res.success) {
      currentUser = res.user;
      updateUserWidgets();
      showAuthenticatedState();
      navigateTo('feed');
      loginForm.reset();
    } else {
      loginAlertError.textContent = res.message;
      loginAlertError.classList.remove('hidden');
    }
  });

  // Auth: Register Form
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerAlertError.classList.add('hidden');

    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const college = document.getElementById('register-college').value;
    const password = document.getElementById('register-password').value;

    const res = await API.register(name, email, college, password);
    if (res.success) {
      currentUser = res.user;
      updateUserWidgets();
      showAuthenticatedState();
      navigateTo('feed');
      registerForm.reset();
    } else {
      registerAlertError.textContent = res.message;
      registerAlertError.classList.remove('hidden');
    }
  });

  // Create Post Attachment Panel Expand
  btnAttachmentToggle.addEventListener('click', () => {
    attachmentsFields.classList.toggle('hidden');
  });

  // Post Textarea Char Counter
  postContentInput.addEventListener('input', (e) => {
    const len = e.target.value.length;
    postCharCount.textContent = `${len}/1000`;
    if (len > 1000) {
      postCharCount.style.color = 'var(--color-danger)';
    } else {
      postCharCount.style.color = 'var(--color-text-muted)';
    }
  });

  // Create Post Submit
  createPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = postContentInput.value;
    const pdfLink = document.getElementById('post-pdf-link').value;
    const githubRepo = document.getElementById('post-github-repo').value;
    const codingResource = document.getElementById('post-coding-resource').value;
    const image = document.getElementById('post-image-url').value;

    const resources = { pdfLink, githubRepo, codingResource };

    const res = await API.createPost(content, image, resources);
    if (res.success) {
      createPostForm.reset();
      postCharCount.textContent = '0/1000';
      attachmentsFields.classList.add('hidden');
      loadFeed();
      checkNewBadges(res.newBadges);
    } else {
      alert(`Failed to create post: ${res.message}`);
    }
  });

  // Edit Profile Bio Char Count Sync
  editProfileBio.addEventListener('input', (e) => {
    editBioCharCount.textContent = `${e.target.value.length}/200`;
  });

  // Trigger file selection click and parse base64
  const btnUploadFileTrigger = document.getElementById('btn-upload-file-trigger');
  const editProfileFile = document.getElementById('edit-profile-file');
  const uploadFileName = document.getElementById('upload-file-name');

  if (btnUploadFileTrigger && editProfileFile) {
    btnUploadFileTrigger.addEventListener('click', () => {
      editProfileFile.click();
    });

    editProfileFile.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        uploadFileName.textContent = file.name;

        // Check if file is image
        if (!file.type.startsWith('image/')) {
          alert('Please select a valid image file.');
          editProfileFile.value = '';
          uploadFileName.textContent = 'No file selected';
          return;
        }

        // Read file as Data URL (base64)
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Url = e.target.result;
          
          // Prefill custom URL input with base64 Data URL
          document.getElementById('edit-profile-avatar').value = base64Url;

          // Deselect all avatar presets
          const grid = document.getElementById('avatar-presets-grid');
          if (grid) {
            grid.querySelectorAll('.avatar-preset-item').forEach(i => i.classList.remove('selected'));
          }
        };
        reader.readAsDataURL(file);
      } else {
        uploadFileName.textContent = 'No file selected';
      }
    });
  }

  // Save Edit Profile Form
  editProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('edit-profile-name').value;
    const college = document.getElementById('edit-profile-college').value;
    let avatarInput = document.getElementById('edit-profile-avatar').value;
    const bio = editProfileBio.value;
    const skills = document.getElementById('edit-profile-skills').value;

    // Check if user entered seed, url, or base64 Data URL
    let profilePicture = avatarInput;
    if (
      avatarInput && 
      !avatarInput.startsWith('http://') && 
      !avatarInput.startsWith('https://') && 
      !avatarInput.startsWith('data:image/')
    ) {
      // Treat as seed for Dicebear
      profilePicture = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatarInput)}`;
    }

    const res = await API.updateUserProfile({ name, college, profilePicture, bio, skills });
    if (res.success) {
      currentUser = res.user;
      updateUserWidgets();
      navigateTo('profile', { userId: currentUser._id });
    } else {
      alert(`Failed to update profile: ${res.message}`);
    }
  });

  // Cancel edit profile button
  document.getElementById('btn-cancel-edit-profile').addEventListener('click', () => {
    navigateTo('profile', { userId: currentUser._id });
  });

  // Logout Sidebar
  document.getElementById('btn-logout-sidebar').addEventListener('click', () => {
    handleLogout();
  });

  const handleLogout = () => {
    API.logout();
    currentUser = null;
    showUnauthenticatedState();
  };

  // Copy Invite Link to Clipboard
  const btnCopyInvite = document.getElementById('btn-copy-invite');
  if (btnCopyInvite) {
    btnCopyInvite.addEventListener('click', () => {
      const inviteLinkEl = document.getElementById('invite-share-link');
      if (inviteLinkEl) {
        inviteLinkEl.select();
        navigator.clipboard.writeText(inviteLinkEl.value)
          .then(() => {
            const icon = btnCopyInvite.querySelector('i');
            icon.className = 'fa-solid fa-check';
            btnCopyInvite.style.color = 'var(--color-success)';
            setTimeout(() => {
              icon.className = 'fa-solid fa-copy';
              btnCopyInvite.style.color = 'var(--color-accent)';
            }, 2000);
          })
          .catch(err => {
            console.error('Failed to copy text: ', err);
          });
      }
    });
  }

  // Invite Email Submit Form
  const inviteEmailForm = document.getElementById('invite-email-form');
  if (inviteEmailForm) {
    inviteEmailForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('invite-email-input');
      const email = emailInput.value;
      
      const subject = encodeURIComponent('Join me on CampusConnect!');
      const body = encodeURIComponent(`Hey!\n\nI joined CampusConnect, a community platform for student developers to share study updates, coding achievements, and useful resources.\n\nCome connect with me on the platform!\n\nJoin here: ${window.location.origin}\n\nCheers!`);
      
      // Open default mail client
      window.open(`mailto:${email}?subject=${subject}&body=${body}`);
      
      // Clear input
      emailInput.value = '';
      
      alert(`Email invitation draft prepared for ${email}! Opening your default mail app...`);
    });
  }

  // Nav actions for auth forms toggle
  document.getElementById('link-goto-register').addEventListener('click', (e) => {
    e.preventDefault();
    showAuthCard('register');
  });

  document.getElementById('link-goto-login').addEventListener('click', (e) => {
    e.preventDefault();
    showAuthCard('login');
  });

  // Navigations - Sidebar Click Links
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const target = item.getAttribute('data-view');
      if (target) {
        navigateTo(target);
      }
    });
  });

  // Navigations - Mobile Bar Click Links
  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const target = item.getAttribute('data-view');
      if (target) {
        navigateTo(target);
      }
    });
  });

  // Mobile Menu sidebar drawer toggler
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
      const sidebar = document.querySelector('.sidebar');
      sidebar.style.display = sidebar.style.display === 'flex' ? 'none' : 'flex';
      sidebar.style.position = 'fixed';
      sidebar.style.zIndex = '99';
      sidebar.style.width = '260px';
    });
  }

  // Hide sidebar on clicking nav items in mobile view
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 900) {
        document.querySelector('.sidebar').style.display = 'none';
      }
    });
  });

  // Hide mobile drawer if screen resizing up
  window.addEventListener('resize', () => {
    const sidebar = document.querySelector('.sidebar');
    if (window.innerWidth > 900) {
      sidebar.style.display = 'flex';
      sidebar.style.position = 'sticky';
      mobileNavBar.classList.add('hidden');
    } else {
      sidebar.style.display = 'none';
      if (currentUser) {
        mobileNavBar.classList.remove('hidden');
      }
    }
  });

  // ==========================================
  // GLOBAL DELEGATED CLICK EVENTS
  // ==========================================
  document.addEventListener('click', async (e) => {
    
    // 1. Post Options Dropdown Menu Toggle (dots icon)
    const optionsTrigger = e.target.closest('.btn-post-options');
    if (optionsTrigger) {
      e.stopPropagation();
      const postId = optionsTrigger.id.replace('options-btn-', '');
      const menu = document.getElementById(`options-menu-${postId}`);
      // Close other open menus
      document.querySelectorAll('.post-options-menu').forEach(m => {
        if (m.id !== `options-menu-${postId}`) m.classList.add('hidden');
      });
      menu.classList.toggle('hidden');
      return;
    }

    // Close options menu when clicking anywhere else
    document.querySelectorAll('.post-options-menu').forEach(m => m.classList.add('hidden'));

    // 2. Toggle Comments Drawer
    const commentToggle = e.target.closest('.btn-comment-toggle');
    if (commentToggle) {
      const postId = commentToggle.getAttribute('data-post-id');
      const drawer = document.getElementById(`comments-section-${postId}`);
      drawer.classList.toggle('hidden');
      return;
    }

    // 3. Toggle Likes (with Badge updates feedback!)
    const likeToggle = e.target.closest('.btn-like-toggle');
    if (likeToggle) {
      const postId = likeToggle.getAttribute('data-post-id');
      likeToggle.disabled = true; // throttle

      const res = await API.likePost(postId);
      likeToggle.disabled = false;

      if (res.success) {
        // Toggle UI Active classes
        if (res.isLiked) {
          likeToggle.classList.add('active-like');
          likeToggle.querySelector('i').className = 'fa-solid fa-heart';
        } else {
          likeToggle.classList.remove('active-like');
          likeToggle.querySelector('i').className = 'fa-regular fa-heart';
        }
        // Update likes label text
        likeToggle.querySelector('span').textContent = `${res.likesCount} Likes`;

        // Check if the author of the post (or logged-in user) unlocked badges (e.g. 10 likes received)
        checkNewBadges(res.newBadges);
      }
      return;
    }

    // 4. Delete Post
    const deletePostBtn = e.target.closest('.btn-delete-post');
    if (deletePostBtn) {
      const postId = deletePostBtn.getAttribute('data-post-id');
      if (confirm('Are you sure you want to delete this post and all its comments?')) {
        const res = await API.deletePost(postId);
        if (res.success) {
          // Slide up and remove element
          const card = document.getElementById(`post-${postId}`);
          if (card) {
            card.style.transform = 'translateY(-20px)';
            card.style.opacity = '0';
            setTimeout(() => {
              card.remove();
              // Refresh counts or lists if on resources tab
              if (currentActiveView === 'resources') loadResourcesHub();
              if (currentActiveView === 'profile') loadUserProfile(currentUser._id);
            }, 300);
          }
        } else {
          alert(`Error deleting post: ${res.message}`);
        }
      }
      return;
    }

    // 5. Delete Comment
    const deleteCommentBtn = e.target.closest('.btn-delete-comment');
    if (deleteCommentBtn) {
      const commentId = deleteCommentBtn.getAttribute('data-comment-id');
      const postId = deleteCommentBtn.getAttribute('data-post-id');
      
      if (confirm('Are you sure you want to delete your comment?')) {
        const res = await API.deleteComment(commentId);
        if (res.success) {
          const commentEl = document.getElementById(`comment-${commentId}`);
          if (commentEl) {
            commentEl.remove();
            
            // Adjust comments count on the post card
            const postCard = document.getElementById(`post-${postId}`);
            if (postCard) {
              const countBtn = postCard.querySelector('.btn-comment-toggle span');
              const currentCount = parseInt(countBtn.textContent) || 0;
              countBtn.textContent = `${Math.max(0, currentCount - 1)} Comments`;
            }
          }
        } else {
          alert(`Error deleting comment: ${res.message}`);
        }
      }
      return;
    }

    // 6. Inline Edit Post - Trigger Form
    const editPostTrigger = e.target.closest('.btn-edit-post-trigger');
    if (editPostTrigger) {
      const postId = editPostTrigger.getAttribute('data-post-id');
      const postCard = document.getElementById(`post-${postId}`);
      const bodyEl = postCard.querySelector('.post-body');
      
      // Save current content for cancel option
      const originalHtml = bodyEl.innerHTML;

      // Extract current values
      const currentText = postCard.querySelector('.post-content').textContent;
      
      // Check resource links
      const pdfPill = postCard.querySelector('.pdf-pill');
      const gitPill = postCard.querySelector('.git-pill');
      const linkPill = postCard.querySelector('.link-pill');
      const imgEl = postCard.querySelector('.post-media img');

      const currentPdf = pdfPill ? pdfPill.getAttribute('href') : '';
      const currentGit = gitPill ? gitPill.getAttribute('href') : '';
      const currentLink = linkPill ? linkPill.getAttribute('href') : '';
      const currentImg = imgEl ? imgEl.getAttribute('src') : '';

      bodyEl.innerHTML = `
        <form class="inline-edit-form" data-post-id="${postId}">
          <div class="form-group">
            <textarea required class="edit-textarea" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid var(--card-border); border-radius:var(--border-radius-sm); padding:0.5rem; color:#fff; height:100px; resize:none;">${currentText}</textarea>
          </div>
          
          <div class="attachment-input-group" style="margin-bottom:0.5rem;">
            <span class="attachment-input-icon"><i class="fa-solid fa-file-pdf"></i></span>
            <input type="url" class="edit-pdf" value="${currentPdf}" placeholder="PDF Notes URL">
          </div>
          <div class="attachment-input-group" style="margin-bottom:0.5rem;">
            <span class="attachment-input-icon"><i class="fa-brands fa-github"></i></span>
            <input type="url" class="edit-git" value="${currentGit}" placeholder="GitHub Repository URL">
          </div>
          <div class="attachment-input-group" style="margin-bottom:0.5rem;">
            <span class="attachment-input-icon"><i class="fa-solid fa-link"></i></span>
            <input type="url" class="edit-link" value="${currentLink}" placeholder="Resource URL">
          </div>
          <div class="attachment-input-group" style="margin-bottom:1rem;">
            <span class="attachment-input-icon"><i class="fa-solid fa-image"></i></span>
            <input type="url" class="edit-img" value="${currentImg}" placeholder="Image URL">
          </div>

          <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
            <button type="button" class="btn btn-secondary btn-cancel-inline-edit" style="padding:0.3rem 0.75rem; font-size:0.8rem;">Cancel</button>
            <button type="submit" class="btn btn-primary" style="padding:0.3rem 0.75rem; font-size:0.8rem;">Save</button>
          </div>
        </form>
      `;

      // Cancel button action
      bodyEl.querySelector('.btn-cancel-inline-edit').addEventListener('click', () => {
        bodyEl.innerHTML = originalHtml;
      });

      // Inline submit action
      bodyEl.querySelector('.inline-edit-form').addEventListener('submit', async (formEvent) => {
        formEvent.preventDefault();
        const newText = bodyEl.querySelector('.edit-textarea').value;
        const newPdf = bodyEl.querySelector('.edit-pdf').value;
        const newGit = bodyEl.querySelector('.edit-git').value;
        const newLink = bodyEl.querySelector('.edit-link').value;
        const newImg = bodyEl.querySelector('.edit-img').value;

        const updateRes = await API.editPost(postId, newText, newImg, { pdfLink: newPdf, githubRepo: newGit, codingResource: newLink });
        if (updateRes.success && updateRes.post) {
          // Replace entire card with the updated rendering
          const freshHtml = UI.renderPostCard(updateRes.post, currentUser._id);
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = freshHtml;
          postCard.replaceWith(tempDiv.firstElementChild);
          
          checkNewBadges(updateRes.newBadges);
        } else {
          alert(`Error saving edits: ${updateRes.message}`);
          bodyEl.innerHTML = originalHtml;
        }
      });

      return;
    }

    // 7. Route to profile (upon clicking user names/avatars)
    const profileTrigger = e.target.closest('.student-profile-trigger');
    if (profileTrigger) {
      const userId = profileTrigger.getAttribute('data-user-id');
      navigateTo('profile', { userId });
      return;
    }

    // 8. Edit Profile Navigation Click
    if (e.target.id === 'btn-edit-profile-trigger') {
      navigateTo('editProfile');
      return;
    }

    // 9. Follow/Unfollow toggle inside Profile page
    if (e.target.id === 'btn-follow-toggle') {
      const userId = e.target.getAttribute('data-user-id');
      e.target.disabled = true;
      const res = await API.followUser(userId);
      e.target.disabled = false;

      if (res.success) {
        // Toggle buttons state
        if (res.isFollowing) {
          e.target.className = 'btn btn-follow btn-following';
          e.target.querySelector('i').className = 'fa-solid fa-user-check';
          e.target.querySelector('span').textContent = 'Following';
        } else {
          e.target.className = 'btn btn-follow btn-accent';
          e.target.querySelector('i').className = 'fa-solid fa-user-plus';
          e.target.querySelector('span').textContent = 'Follow';
        }
        // Update follower count metric
        document.getElementById('profile-followers-count').textContent = res.followersCount;
        
        // Sync widgets
        API.getMe().then(r => {
          if (r.success) {
            currentUser = r.user;
            updateUserWidgets();
          }
        });
      }
      return;
    }

    // 10. Follow/Unfollow toggle inside Explore grid list
    const exploreFollowBtn = e.target.closest('.btn-explore-follow-toggle');
    if (exploreFollowBtn) {
      const userId = exploreFollowBtn.getAttribute('data-user-id');
      exploreFollowBtn.disabled = true;
      const res = await API.followUser(userId);
      exploreFollowBtn.disabled = false;

      if (res.success) {
        if (res.isFollowing) {
          exploreFollowBtn.className = 'btn btn-follow btn-following btn-block btn-explore-follow-toggle';
          exploreFollowBtn.querySelector('i').className = 'fa-solid fa-user-check';
          exploreFollowBtn.querySelector('span').textContent = 'Following';
        } else {
          exploreFollowBtn.className = 'btn btn-follow btn-accent btn-block btn-explore-follow-toggle';
          exploreFollowBtn.querySelector('i').className = 'fa-solid fa-user-plus';
          exploreFollowBtn.querySelector('span').textContent = 'Follow';
        }
        
        // Sync widgets
        API.getMe().then(r => {
          if (r.success) {
            currentUser = r.user;
            updateUserWidgets();
          }
        });
      }
      return;
    }

    // 11. Profile Page Go back button
    if (e.target.closest('.btn-back-to-feed')) {
      navigateTo('feed');
      return;
    }

    // 12. Copy invite link from Explore empty state
    const copyInviteExploreBtn = e.target.closest('.btn-copy-invite-explore');
    if (copyInviteExploreBtn) {
      const shareUrl = window.location.origin;
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          alert('CampusConnect invitation link copied to clipboard! Share it with your classmates.');
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
        });
      return;
    }
  });

  // ==========================================
  // COMMENT SUBMISSIONS (DELEGATED)
  // ==========================================
  document.addEventListener('submit', async (e) => {
    const commentForm = e.target.closest('.comment-form');
    if (!commentForm) return;

    e.preventDefault();
    const postId = commentForm.getAttribute('data-post-id');
    const input = commentForm.querySelector('input');
    const commentText = input.value;
    
    commentForm.querySelector('button').disabled = true;

    const res = await API.addComment(postId, commentText);
    commentForm.querySelector('button').disabled = false;

    if (res.success && res.comment) {
      input.value = '';
      
      // Append the comment to list
      const list = document.getElementById(`comments-list-${postId}`);
      const placeholder = list.querySelector('.no-comments-placeholder');
      if (placeholder) placeholder.remove();

      const itemHtml = `
        <div class="comment-item" id="comment-${res.comment._id}">
          <img src="${res.comment.userId.profilePicture || 'https://api.dicebear.com/7.x/adventurer/svg?seed=mock'}" alt="" class="comment-author-avatar">
          <div class="comment-content-wrapper">
            <div class="comment-author-meta">
              <span class="comment-author-name student-profile-trigger" data-user-id="${res.comment.userId._id}">${res.comment.userId.name}</span>
              <span class="comment-time">Just now</span>
            </div>
            <div class="comment-text">${res.comment.commentText}</div>
          </div>
          <button class="btn-delete-comment" data-comment-id="${res.comment._id}" data-post-id="${postId}" title="Delete comment">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      `;
      
      list.insertAdjacentHTML('beforeend', itemHtml);
      
      // Update comment count trigger
      const postCard = document.getElementById(`post-${postId}`);
      if (postCard) {
        const countBtn = postCard.querySelector('.btn-comment-toggle span');
        const currentCount = parseInt(countBtn.textContent) || 0;
        countBtn.textContent = `${currentCount + 1} Comments`;
      }

      // Check if commenter earned achievements badges
      checkNewBadges(res.newBadges);
    } else {
      alert(`Error submitting comment: ${res.message}`);
    }
  });

  // Kickstart App
  initApp();
});
