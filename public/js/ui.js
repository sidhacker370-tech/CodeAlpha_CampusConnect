/**
 * CampusConnect UI Renderer
 * Generates dynamic HTML elements and views.
 */
const UI = (() => {
  
  // Format timestamps nicely (e.g., "5m ago", "2h ago")
  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Maps badge code to metadata
  const BADGE_META = {
    'first-post': {
      name: 'First Post',
      icon: 'fa-award',
      class: 'first-post-badge',
      desc: 'Awarded for sharing your first update with the student community.'
    },
    'resource-guru': {
      name: 'Resource Guru',
      icon: 'fa-book',
      class: 'resource-guru-badge',
      desc: 'Shared 3 or more study resources (PDFs, repositories, articles).'
    },
    'ten-likes': {
      name: '10 Likes Received',
      icon: 'fa-heart',
      class: 'ten-likes-badge',
      desc: 'Received a sum of 10 or more likes on community updates.'
    },
    'top-contributor': {
      name: 'Top Contributor',
      icon: 'fa-star',
      class: 'top-contributor-badge',
      desc: 'Authored at least 5 posts and written at least 10 comments.'
    }
  };

  // Render a badge tag
  const renderBadgeTag = (badgeCode) => {
    const meta = BADGE_META[badgeCode];
    if (!meta) return '';
    return `
      <span class="badge-tag ${meta.class}" title="${meta.desc}">
        <i class="fa-solid ${meta.icon}"></i> ${meta.name}
      </span>
    `;
  };

  return {
    // Expose Badge Meta
    BADGE_META,

    // Show sliding achievement unlock toast
    showBadgeToast: (badgeCode) => {
      const meta = BADGE_META[badgeCode];
      if (!meta) return;

      const container = document.getElementById('badge-alert-container');
      container.classList.remove('hidden');

      const toast = document.createElement('div');
      toast.className = 'badge-earned-toast';
      toast.innerHTML = `
        <div class="toast-badge-icon ${meta.class}">
          <i class="fa-solid ${meta.icon}"></i>
        </div>
        <div class="toast-content">
          <div class="toast-title">Achievement Unlocked!</div>
          <div class="toast-desc">You've earned the <strong>${meta.name}</strong> Badge.</div>
        </div>
        <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>
      `;

      // Wire up close button
      toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
        if (container.children.length === 0) {
          container.classList.add('hidden');
        }
      });

      container.appendChild(toast);

      // Autohide after 6 seconds
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
          if (container.children.length === 0) {
            container.classList.add('hidden');
          }
        }
      }, 6000);
    },

    // Render a single post card
    renderPostCard: (post, currentUserId) => {
      const isAuthor = post.userId._id === currentUserId;
      const isLiked = post.likes.includes(currentUserId);
      const likesCount = post.likes.length;
      const comments = post.comments || [];
      const commentsCount = comments.length;
      const author = post.userId;
      
      // Resource variables
      const pdf = post.resources?.pdfLink;
      const git = post.resources?.githubRepo;
      const link = post.resources?.codingResource;

      let resourcesHtml = '';
      if (pdf || git || link) {
        resourcesHtml = `<div class="post-resources">`;
        if (pdf) {
          resourcesHtml += `
            <a href="${pdf}" target="_blank" rel="noopener noreferrer" class="resource-pill pdf-pill">
              <i class="fa-solid fa-file-pdf"></i> Study Notes PDF
            </a>
          `;
        }
        if (git) {
          resourcesHtml += `
            <a href="${git}" target="_blank" rel="noopener noreferrer" class="resource-pill git-pill">
              <i class="fa-brands fa-github"></i> GitHub Code
            </a>
          `;
        }
        if (link) {
          resourcesHtml += `
            <a href="${link}" target="_blank" rel="noopener noreferrer" class="resource-pill link-pill">
              <i class="fa-solid fa-link"></i> Study Resource
            </a>
          `;
        }
        resourcesHtml += `</div>`;
      }

      // Check if author has earned badges to display in feed header
      let badgesHtml = '';
      if (author.badges && author.badges.length > 0) {
        badgesHtml = `<div class="post-header-badges">` + 
          author.badges.map(b => `<i class="fa-solid ${BADGE_META[b]?.icon || 'fa-award'} ${BADGE_META[b]?.class || ''}" title="${BADGE_META[b]?.name || ''}" style="margin-left:4px; font-size:12px;"></i>`).join('') +
          `</div>`;
      }

      // Comments items HTML
      let commentsListHtml = '';
      comments.forEach(comment => {
        const isCommentAuthor = comment.userId._id === currentUserId;
        commentsListHtml += `
          <div class="comment-item" id="comment-${comment._id}">
            <img src="${comment.userId.profilePicture || 'https://api.dicebear.com/7.x/adventurer/svg?seed=mock'}" alt="" class="comment-author-avatar">
            <div class="comment-content-wrapper">
              <div class="comment-author-meta">
                <span class="comment-author-name student-profile-trigger" data-user-id="${comment.userId._id}">${comment.userId.name}</span>
                <span class="comment-time">${formatTime(comment.createdAt)}</span>
              </div>
              <div class="comment-text">${comment.commentText}</div>
            </div>
            ${isCommentAuthor ? `
              <button class="btn-delete-comment" data-comment-id="${comment._id}" data-post-id="${post._id}" title="Delete comment">
                <i class="fa-solid fa-trash"></i>
              </button>
            ` : ''}
          </div>
        `;
      });

      return `
        <article class="post-card" id="post-${post._id}">
          <div class="post-header">
            <div class="post-author-info student-profile-trigger" data-user-id="${author._id}">
              <img src="${author.profilePicture || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Name'}" alt="${author.name}" class="avatar-sm">
              <div class="author-meta">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span class="author-name">${author.name}</span>
                  ${badgesHtml}
                </div>
                <span class="author-college">${author.college}</span>
              </div>
            </div>
            <div class="post-header-right" style="display:flex; align-items:center; gap:12px;">
              <span class="post-timestamp">${formatTime(post.createdAt)}</span>
              ${isAuthor ? `
                <div class="post-options">
                  <button class="btn-post-options" id="options-btn-${post._id}">
                    <i class="fa-solid fa-ellipsis-vertical"></i>
                  </button>
                  <div class="post-options-menu hidden" id="options-menu-${post._id}">
                    <button class="menu-item btn-edit-post-trigger" data-post-id="${post._id}"><i class="fa-solid fa-pen"></i> Edit</button>
                    <button class="menu-item danger-text btn-delete-post" data-post-id="${post._id}"><i class="fa-solid fa-trash"></i> Delete</button>
                  </div>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="post-body">
            <div class="post-content">${post.content}</div>
            ${post.image ? `
              <div class="post-media">
                <img src="${post.image}" alt="Attached media">
              </div>
            ` : ''}
            ${resourcesHtml}
          </div>

          <div class="post-actions">
            <button class="action-btn btn-like-toggle ${isLiked ? 'active-like' : ''}" data-post-id="${post._id}">
              <i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart"></i>
              <span>${likesCount} Likes</span>
            </button>
            <button class="action-btn btn-comment-toggle" data-post-id="${post._id}">
              <i class="fa-regular fa-comment"></i>
              <span>${commentsCount} Comments</span>
            </button>
          </div>

          <!-- Comments Drawer -->
          <div class="comments-section hidden" id="comments-section-${post._id}">
            <div class="comments-list" id="comments-list-${post._id}">
              ${commentsListHtml || `<div class="no-comments-placeholder" style="text-align:center; padding:1rem; font-size:0.8rem; color:var(--color-text-muted);">No comments yet. Be the first to share your thoughts!</div>`}
            </div>
            <form class="comment-form" data-post-id="${post._id}">
              <input type="text" placeholder="Write a comment..." required maxlength="500">
              <button type="submit" class="btn btn-primary" style="padding:0.4rem 0.8rem; font-size:0.8rem;"><i class="fa-solid fa-paper-plane"></i></button>
            </form>
          </div>
        </article>
      `;
    },

    // Render user profile details view
    renderProfile: (user, posts, currentUserId) => {
      const isOwnProfile = user._id === currentUserId;
      
      // Skills HTML list
      const skillsHtml = user.skills && user.skills.length > 0
        ? user.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')
        : '<p class="color-text-muted" style="font-size:0.85rem;">No skills added yet.</p>';

      // Badges HTML list
      const badgesHtml = user.badges && user.badges.length > 0
        ? user.badges.map(b => renderBadgeTag(b)).join('')
        : '<p class="color-text-muted" style="font-size:0.85rem; width:100%;">No achievements badges unlocked yet.</p>';

      // Action button (Edit Profile or Follow/Unfollow)
      let actionBtnHtml = '';
      if (isOwnProfile) {
        actionBtnHtml = `
          <button class="btn btn-secondary" id="btn-edit-profile-trigger">
            <i class="fa-solid fa-user-gear"></i> Edit Profile
          </button>
        `;
      } else {
        actionBtnHtml = `
          <button class="btn btn-follow ${user.isFollowing ? 'btn-following' : 'btn-accent'}" id="btn-follow-toggle" data-user-id="${user._id}">
            <i class="fa-solid ${user.isFollowing ? 'fa-user-check' : 'fa-user-plus'}"></i>
            <span>${user.isFollowing ? 'Following' : 'Follow'}</span>
          </button>
        `;
      }

      // Render posts feed of the profile
      let postsListHtml = '';
      if (posts && posts.length > 0) {
        posts.forEach(post => {
          postsListHtml += UI.renderPostCard(post, currentUserId);
        });
      } else {
        postsListHtml = `
          <div class="no-items-state">
            <i class="fa-solid fa-message"></i>
            <p>No community updates posted yet.</p>
          </div>
        `;
      }

      return `
        <!-- Profile Banner -->
        <div class="profile-banner">
          <div class="profile-action-btn-container">
            ${actionBtnHtml}
          </div>
          <div class="profile-banner-top">
            <img src="${user.profilePicture || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + encodeURIComponent(user.name)}" alt="${user.name}" class="avatar-lg">
            <div class="profile-banner-details">
              <h1 class="profile-full-name">${user.name}</h1>
              <div class="profile-college-name">
                <i class="fa-solid fa-school"></i> ${user.college}
              </div>
              <p class="profile-bio-text">${user.bio || 'This student profile has no bio description yet.'}</p>
              
              <div class="profile-metrics">
                <div class="metric-box">
                  <span class="metric-num" id="profile-followers-count">${user.followersCount}</span>
                  <span class="metric-label">Followers</span>
                </div>
                <div class="metric-box">
                  <span class="metric-num">${user.followingCount}</span>
                  <span class="metric-label">Following</span>
                </div>
                <div class="metric-box">
                  <span class="metric-num">${posts.length}</span>
                  <span class="metric-label">Posts</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Details Grid layout -->
        <div class="profile-grid-layout">
          <div class="section-card">
            <h3 class="section-card-title">Unlocked Badges</h3>
            <div class="profile-badges-flex">
              ${badgesHtml}
            </div>
          </div>

          <div class="section-card">
            <h3 class="section-card-title">Tech Skills</h3>
            <div class="profile-skills-flex">
              ${skillsHtml}
            </div>
          </div>

          <div class="section-card" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
            <div>
              <h3 class="section-card-title">Followers (${user.followersCount})</h3>
              <div class="connections-list" style="display: flex; flex-direction: column; gap: 0.65rem; max-height: 200px; overflow-y: auto; padding-right: 0.25rem;">
                ${user.followers && user.followers.length > 0 ? user.followers.map(f => `
                  <div class="student-profile-trigger" data-user-id="${f._id}" style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer; padding: 0.35rem; border-radius: var(--border-radius-sm); background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.03);">
                    <img src="${f.profilePicture || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + encodeURIComponent(f.name)}" alt="" class="avatar-sm" style="width: 28px; height: 28px;">
                    <div style="min-width: 0; flex-grow: 1;">
                      <div style="font-size: 0.8rem; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${f.name}</div>
                      <div style="font-size: 0.7rem; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${f.college}</div>
                    </div>
                  </div>
                `).join('') : '<p class="color-text-muted" style="font-size: 0.8rem;">No followers yet.</p>'}
              </div>
            </div>
            <div>
              <h3 class="section-card-title">Following (${user.followingCount})</h3>
              <div class="connections-list" style="display: flex; flex-direction: column; gap: 0.65rem; max-height: 200px; overflow-y: auto; padding-right: 0.25rem;">
                ${user.following && user.following.length > 0 ? user.following.map(f => `
                  <div class="student-profile-trigger" data-user-id="${f._id}" style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer; padding: 0.35rem; border-radius: var(--border-radius-sm); background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.03);">
                    <img src="${f.profilePicture || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + encodeURIComponent(f.name)}" alt="" class="avatar-sm" style="width: 28px; height: 28px;">
                    <div style="min-width: 0; flex-grow: 1;">
                      <div style="font-size: 0.8rem; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${f.name}</div>
                      <div style="font-size: 0.7rem; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${f.college}</div>
                    </div>
                  </div>
                `).join('') : '<p class="color-text-muted" style="font-size: 0.8rem;">Not following anyone yet.</p>'}
              </div>
            </div>
          </div>

          <div>
            <h2 class="view-title" style="font-size:1.4rem; margin:1.5rem 0 1rem 0; font-family:var(--font-display);">Recent Updates</h2>
            <div class="profile-posts-list">
              ${postsListHtml}
            </div>
          </div>
        </div>
      `;
    },

    // Render an explore user card
    renderExploreCard: (user, currentUserId) => {
      const isFollowing = user.followers.includes(currentUserId);
      
      // Miniature badges list
      let badgesHtml = '';
      if (user.badges && user.badges.length > 0) {
        badgesHtml = user.badges.slice(0, 3).map(b => `
          <i class="fa-solid ${BADGE_META[b]?.icon || 'fa-award'} ${BADGE_META[b]?.class || ''}" 
             title="${BADGE_META[b]?.name}"
             style="font-size: 14px; margin: 0 2px;"></i>
        `).join('');
      } else {
        badgesHtml = '<span style="font-size:0.75rem; color:var(--color-text-muted);">No badges</span>';
      }

      return `
        <div class="student-card" id="student-${user._id}">
          <img src="${user.profilePicture || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + encodeURIComponent(user.name)}" alt="" class="avatar-md student-profile-trigger" data-user-id="${user._id}" style="cursor:pointer;">
          <h3 class="student-name student-profile-trigger" data-user-id="${user._id}" style="cursor:pointer;">${user.name}</h3>
          <div class="student-college">${user.college}</div>
          <p class="student-bio">${user.bio || 'Student developer. No bio description entered yet.'}</p>
          <div class="student-card-badges">
            ${badgesHtml}
          </div>
          <button class="btn btn-follow ${isFollowing ? 'btn-following' : 'btn-accent'} btn-block btn-explore-follow-toggle" data-user-id="${user._id}">
            <i class="fa-solid ${isFollowing ? 'fa-user-check' : 'fa-user-plus'}"></i>
            <span>${isFollowing ? 'Following' : 'Follow'}</span>
          </button>
        </div>
      `;
    },

    // Render Resources Hub dynamic rows
    renderResourceHubItem: (post) => {
      const author = post.userId;
      const pdf = post.resources?.pdfLink;
      const git = post.resources?.githubRepo;
      const link = post.resources?.codingResource;

      let itemsHtml = '';

      if (pdf) {
        itemsHtml += `
          <div class="resource-row-card">
            <div class="resource-left">
              <div class="resource-type-icon pdf"><i class="fa-solid fa-file-pdf"></i></div>
              <div class="resource-details">
                <a href="${pdf}" target="_blank" class="resource-desc" title="${post.content}">${post.content.slice(0, 80)}${post.content.length > 80 ? '...' : ''}</a>
                <span class="resource-meta">Shared by <strong class="student-profile-trigger" data-user-id="${author._id}" style="cursor:pointer;">${author.name}</strong> • ${formatTime(post.createdAt)}</span>
              </div>
            </div>
            <a href="${pdf}" target="_blank" class="btn btn-secondary"><i class="fa-solid fa-download"></i> View PDF</a>
          </div>
        `;
      }
      if (git) {
        itemsHtml += `
          <div class="resource-row-card">
            <div class="resource-left">
              <div class="resource-type-icon github"><i class="fa-brands fa-github"></i></div>
              <div class="resource-details">
                <a href="${git}" target="_blank" class="resource-desc" title="${post.content}">${post.content.slice(0, 80)}${post.content.length > 80 ? '...' : ''}</a>
                <span class="resource-meta">Shared by <strong class="student-profile-trigger" data-user-id="${author._id}" style="cursor:pointer;">${author.name}</strong> • ${formatTime(post.createdAt)}</span>
              </div>
            </div>
            <a href="${git}" target="_blank" class="btn btn-accent"><i class="fa-brands fa-github"></i> Clone Repo</a>
          </div>
        `;
      }
      if (link) {
        itemsHtml += `
          <div class="resource-row-card">
            <div class="resource-left">
              <div class="resource-type-icon link"><i class="fa-solid fa-link"></i></div>
              <div class="resource-details">
                <a href="${link}" target="_blank" class="resource-desc" title="${post.content}">${post.content.slice(0, 80)}${post.content.length > 80 ? '...' : ''}</a>
                <span class="resource-meta">Shared by <strong class="student-profile-trigger" data-user-id="${author._id}" style="cursor:pointer;">${author.name}</strong> • ${formatTime(post.createdAt)}</span>
              </div>
            </div>
            <a href="${link}" target="_blank" class="btn btn-secondary"><i class="fa-solid fa-arrow-up-right-from-square"></i> Open Link</a>
          </div>
        `;
      }

      return itemsHtml;
    }
  };
})();
