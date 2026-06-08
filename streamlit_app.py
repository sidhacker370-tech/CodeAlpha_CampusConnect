import streamlit as st
import requests

st.set_page_config(page_title="CampusConnect | Student Dashboard", page_icon="🎓", layout="wide")

# Custom Styling to match Glassmorphic theme
st.markdown("""
<style>
    .main {
        background-color: #0b0f19;
        color: #f8fafc;
    }
    .stButton>button {
        background-color: #6366f1;
        color: white;
        border-radius: 8px;
        border: none;
        padding: 0.5rem 1.5rem;
        font-weight: bold;
        transition: all 0.3s;
    }
    .stButton>button:hover {
        background-color: #4f46e5;
        transform: translateY(-2px);
    }
</style>
""", unsafe_allow_code_html=True)

st.sidebar.title("CampusConnect 🎓")
st.sidebar.markdown("---")

# Server API URL Config
api_url = st.sidebar.text_input(
    "API Backend Server URL", 
    value="https://codealpha-campusconnect.onrender.com",
    help="Enter the URL of your deployed Express backend (e.g. your Render or Vercel API URL)"
)

# Session State Init
if "token" not in st.session_state:
    st.session_state.token = None
if "user" not in st.session_state:
    st.session_state.user = None

# Navigation menu depending on Auth state
if not st.session_state.token:
    menu = ["Login", "Register Account"]
else:
    menu = ["Home Feed", "Share an Update", "Explore Students", "My Profile", "Logout"]

choice = st.sidebar.selectbox("Dashboard Navigation", menu)

# Auth headers helper
def get_headers():
    if st.session_state.token:
        return {"Authorization": f"Bearer {st.session_state.token}"}
    return {}

if choice == "Login":
    st.subheader("Login to CampusConnect Hub")
    email = st.text_input("College Email Address")
    password = st.text_input("Password", type="password")
    
    if st.button("Sign In"):
        with st.spinner("Authenticating..."):
            try:
                res = requests.post(f"{api_url}/api/auth/login", json={"email": email, "password": password})
                if res.status_code == 200:
                    data = res.json()
                    st.session_state.token = data.get("token")
                    st.session_state.user = data.get("user")
                    st.success("Successfully logged in!")
                    st.rerun()
                else:
                    st.error(res.json().get("message", "Invalid email or password."))
            except Exception as e:
                st.error(f"Cannot connect to the server at {api_url}. Verify the server is online.")

elif choice == "Register Account":
    st.subheader("Join Student Developer Network")
    name = st.text_input("Full Name")
    email = st.text_input("College Email Address")
    college = st.text_input("College / University Name")
    password = st.text_input("Password (min. 6 characters)", type="password")
    
    if st.button("Create Account"):
        if len(password) < 6:
            st.warning("Password must be at least 6 characters.")
        else:
            with st.spinner("Registering..."):
                try:
                    res = requests.post(f"{api_url}/api/auth/register", json={
                        "name": name, "email": email, "college": college, "password": password
                    })
                    if res.status_code == 201:
                        data = res.json()
                        st.session_state.token = data.get("token")
                        st.session_state.user = data.get("user")
                        st.success("Account created successfully!")
                        st.rerun()
                    else:
                        st.error(res.json().get("message", "Registration failed."))
                except Exception as e:
                    st.error(f"Cannot connect to server at {api_url}.")

elif choice == "Home Feed":
    st.subheader("Student Feed Updates")
    try:
        res = requests.get(f"{api_url}/api/posts", headers=get_headers())
        if res.status_code == 200:
            posts = res.json().get("posts", [])
            if not posts:
                st.info("No updates shared on this campus yet.")
            for post in posts:
                author = post.get("userId", {})
                
                # Render post header
                st.markdown(f"### 👤 {author.get('name', 'Anonymous')}")
                st.caption(f"🏫 {author.get('college', 'Unknown')} • Published: {post.get('createdAt')[:10]}")
                
                # Content
                st.write(post.get("content"))
                
                # Image
                if post.get("image"):
                    st.image(post.get("image"), use_container_width=True)
                
                # Resource links
                resources = post.get("resources", {})
                if resources and any(resources.values()):
                    st.write("**Resource Attachments:**")
                    cols = st.columns(3)
                    if resources.get("pdfLink"):
                        cols[0].markdown(f"[📕 View Study Notes PDF]({resources.get('pdfLink')})")
                    if resources.get("githubRepo"):
                        cols[1].markdown(f"[🐙 Clone GitHub Code]({resources.get('githubRepo')})")
                    if resources.get("codingResource"):
                        cols[2].markdown(f"[🔗 External Link]({resources.get('codingResource')})")
                
                # Likes & comments statistics
                likes = len(post.get("likes", []))
                comments_count = len(post.get("comments", []))
                st.write(f"❤️ {likes} Likes | 💬 {comments_count} Comments")
                st.markdown("---")
        else:
            st.error("Error loading feed.")
    except Exception as e:
        st.error("Connection failed. Check your API server status.")

elif choice == "Share an Update":
    st.subheader("Share Study & Project Updates")
    content = st.text_area("What are you coding or studying today?", max_chars=1000)
    
    st.write("#### Attach Study Resources")
    pdf = st.text_input("PDF Notes URL (e.g., Google Drive link)")
    git = st.text_input("GitHub Repository URL")
    link = st.text_input("Coding Resource URL")
    image = st.text_input("Optional Image URL")
    
    if st.button("Publish Update"):
        if not content:
            st.warning("Please enter post content.")
        else:
            with st.spinner("Posting..."):
                try:
                    res = requests.post(
                        f"{api_url}/api/posts",
                        headers=get_headers(),
                        json={
                            "content": content,
                            "image": image,
                            "resources": {"pdfLink": pdf, "githubRepo": git, "codingResource": link}
                        }
                    )
                    if res.status_code == 201:
                        st.success("Post shared successfully!")
                        # Celebrate if user got any new badges
                        new_badges = res.json().get("newBadges", [])
                        if new_badges:
                            st.balloons()
                            for badge in new_badges:
                                st.success(f"🎉 Achievement unlocked: **{badge.replace('-', ' ').title()}** Badge!")
                    else:
                        st.error("Failed to share update.")
                except Exception as e:
                    st.error("Connection failed.")

elif choice == "Explore Students":
    st.subheader("Student Directory")
    try:
        res = requests.get(f"{api_url}/api/users", headers=get_headers())
        if res.status_code == 200:
            users = res.json().get("users", [])
            if not users:
                st.info("No other students registered yet.")
            for user in users:
                st.markdown(f"#### 👤 {user.get('name')}")
                st.write(f"🏫 **College:** {user.get('college')}")
                st.write(f"📝 **Bio:** {user.get('bio', 'No bio description.')}")
                
                # Render skills
                skills = user.get("skills", [])
                if skills:
                    st.write(f"💡 **Skills:** {', '.join(skills)}")
                
                # Render badges
                badges = user.get("badges", [])
                if badges:
                    st.write(f"🏆 **Badges:** {', '.join([b.replace('-', ' ').title() for b in badges])}")
                st.markdown("---")
        else:
            st.error("Failed to fetch student list.")
    except Exception as e:
        st.error("Connection failed.")

elif choice == "My Profile":
    st.subheader("My Student Profile")
    try:
        # Fetch fresh data from backend
        res = requests.get(f"{api_url}/api/auth/me", headers=get_headers())
        if res.status_code == 200:
            user = res.json().get("user", {})
            st.session_state.user = user
            
            st.write(f"👤 **Name:** {user.get('name')}")
            st.write(f"✉️ **Email:** {user.get('email')}")
            st.write(f"🏫 **College:** {user.get('college')}")
            st.write(f"📝 **Bio:** {user.get('bio', 'No bio description.')}")
            
            skills = user.get("skills", [])
            if skills:
                st.write(f"💡 **Skills:** {', '.join(skills)}")
                
            badges = user.get("badges", [])
            if badges:
                st.write(f"🏆 **Earned Badges:** {', '.join([b.replace('-', ' ').title() for b in badges])}")
        else:
            st.error("Could not fetch profile details.")
    except Exception as e:
        st.error("Connection failed.")

elif choice == "Logout":
    st.session_state.token = None
    st.session_state.user = None
    st.success("Successfully logged out.")
    st.rerun()
