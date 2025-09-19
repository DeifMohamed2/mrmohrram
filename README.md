# Mr. Moharr7am - Advanced IG Mathematics Learning Platform

<div align="center">
  <img src="public/images/logo.png" alt="Mr. Moharr7am Logo" width="150" height="150">
  
  [![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
  [![Express.js](https://img.shields.io/badge/Express.js-5.1+-blue.svg)](https://expressjs.com/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green.svg)](https://mongodb.com/)
  [![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
  
  **A comprehensive e-learning platform for IG Mathematics students with advanced features**
</div>

## 📚 Overview

Mr. Moharr7am is a sophisticated educational platform designed specifically for IG (International General) Mathematics students. The platform provides a comprehensive learning environment with interactive content, progress tracking, homework management, and automated communication systems.

## ✨ Key Features

### 🎯 **Multi-Year Curriculum Support**
- **Years 8, 9, and 10** mathematics curriculum
- **Cambridge and Edexcel** curriculum support
- **Flexible learning modes**: School, Center, and Online
- Structured weekly content with progressive difficulty

### 📊 **Advanced Progress Tracking**
- Real-time progress monitoring
- Completion tracking for each week
- Detailed analytics and statistics
- Study time tracking
- Performance metrics and scoring

### 📝 **Comprehensive Content Management**
- **Weekly structured content** with materials
- **Homework assignments** with submission tracking
- **Past papers and examinations** with secure PDF viewing
- **Notes and study materials** with download capabilities
- **Interactive 3D math visualizations**

### 🔐 **Role-Based Access Control**
- **Student accounts** with personalized dashboards
- **Admin panel** for content and user management
- **Teacher accounts** for content creation
- **Flexible restrictions** and access controls
- **Account activation** system

### 📱 **WhatsApp Integration**
- **Automated homework submission notifications** to parents
- **Due date reminders** for pending assignments
- **Bilingual notifications** (English/Arabic)
- **Admin notifications** for missed submissions
- **Scheduled task automation**

### 🎨 **Modern User Interface**
- **Responsive design** for all devices
- **Dark/Light mode** toggle
- **Interactive animations** and visual effects
- **Math-themed UI elements**
- **Advanced 3D visualizations** for mathematical concepts

### 📁 **File Management**
- **Cloudinary integration** for media storage
- **Secure file uploads** (PDF, DOC, images)
- **100MB file size limit**
- **Automatic file validation**

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **bcryptjs** - Password hashing
- **express-session** - Session management
- **multer** - File upload handling
- **node-cron** - Scheduled tasks

### Frontend
- **EJS** - Template engine
- **Bootstrap** - CSS framework
- **Font Awesome** - Icons
- **GSAP** - Animation library
- **Three.js** - 3D graphics
- **Anime.js** - Animation library
- **Math.js** - Mathematical computations

### External Services
- **Cloudinary** - Cloud media management
- **WhatsApp API** - Automated messaging
- **Custom notification system**

## 📁 Project Structure

```
mr-moharr7am/
├── 📁 config/
│   └── db.js                    # Database configuration
├── 📁 controllers/
│   ├── adminController.js       # Admin functionality
│   ├── authController.js        # Authentication logic
│   └── studentController.js     # Student features
├── 📁 middlewares/
│   └── auth.js                  # Authentication middleware
├── 📁 models/
│   ├── User.js                  # User schema with progress tracking
│   ├── Week.js                  # Weekly content structure
│   ├── WeekContent.js           # Individual content items
│   ├── YearContent.js           # Year-specific content
│   ├── HomeworkSubmission.js    # Homework submissions
│   ├── PastPaper.js             # Past examination papers
│   ├── StudentProgress.js       # Progress tracking
│   ├── Note.js                  # Study notes
│   └── Restriction.js           # Access restrictions
├── 📁 public/
│   ├── 📁 css/                  # Stylesheets
│   ├── 📁 js/                   # Client-side JavaScript
│   ├── 📁 images/               # Static images
│   └── 📁 Slider Images/        # Student gallery
├── 📁 routes/
│   ├── index.js                 # Main routes
│   ├── auth.js                  # Authentication routes
│   ├── student.js               # Student routes
│   └── admin.js                 # Admin routes
├── 📁 utils/
│   ├── createAdmin.js           # Admin user creation
│   ├── notificationService.js   # Notification system
│   ├── scheduledTasks.js        # Automated tasks
│   ├── whatsappService.js       # WhatsApp integration
│   └── wasender.js              # WhatsApp API wrapper
├── 📁 views/
│   ├── 📁 Admin/                # Admin interface
│   ├── 📁 Student/              # Student interface
│   ├── 📁 auth/                 # Authentication pages
│   ├── 📁 partials/             # Reusable components
│   ├── index.ejs                # Landing page
│   └── 404.ejs                  # Error page
├── app.js                       # Application entry point
├── package.json                 # Dependencies and scripts
└── README.md                    # This file
```

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** (v18 or higher)
- **MongoDB** (v6.0 or higher)
- **npm** or **yarn**

### 1. Clone the Repository
```bash
git clone https://github.com/DeifMohamed2/mrmohrram.git
cd mrmohrram
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/mr-moharr7am

# Session
SESSION_SECRET=your_very_secure_session_secret_here

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# WhatsApp Integration
ADMIN_PHONE=your_admin_phone_number
WHATSAPP_API_URL=your_whatsapp_api_endpoint
WHATSAPP_TOKEN=your_whatsapp_api_token

# Optional: Additional Configuration
DEFAULT_COUNTRY_CODE=20
```

### 4. Database Setup
Ensure MongoDB is running and accessible at the configured URI.

### 5. Start the Application

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

### 6. Access the Application
Open your browser and navigate to `http://localhost:3000`

## 👥 User Roles & Features

### 🎓 Student Features
- **Personalized Dashboard** with progress overview
- **Weekly Content Access** based on year and curriculum
- **Homework Submission** with file uploads
- **Past Papers** with secure viewing
- **Study Notes** download
- **Progress Tracking** and analytics
- **Interactive Learning** with 3D visualizations

### 👨‍🏫 Admin Features
- **User Management** with activation controls
- **Content Creation** for weeks and materials
- **Homework Assignment** management
- **Progress Monitoring** for all students
- **Restriction Management** for content access
- **Notification System** oversight
- **Analytics Dashboard** with comprehensive reports

### 👩‍🏫 Teacher Features
- **Content Creation** and management
- **Homework Review** and feedback
- **Student Progress** monitoring
- **Material Organization** by week and year

## 📱 WhatsApp Integration

The platform includes sophisticated WhatsApp automation:

### 🔔 **Automated Notifications**
- **Homework Submission Alerts** sent to parents
- **Due Date Reminders** for pending assignments
- **Bilingual Messages** (English/Arabic)
- **Admin Notifications** for system events

### ⚙️ **Scheduled Tasks**
- **Daily homework reminders** for overdue assignments
- **Weekly progress summaries** to administrators
- **Automated cleanup** of old notifications

## 🔧 Configuration Options

### User Registration
- **Student code generation** (automatic)
- **Curriculum selection** (Cambridge/Edexcel)
- **Learning mode** (School/Center/Online)
- **Parent contact** information

### Content Management
- **Week-based organization** (1-52 weeks)
- **Material types**: homework, notes, PDFs, interactive content
- **Due date management** with automated reminders
- **Access restrictions** per user/group

### Progress Tracking
- **Completion tracking** for materials
- **Time spent** monitoring
- **Score calculation** and averaging
- **Performance analytics**

## 📊 Database Schema

### Key Models
- **User**: Comprehensive student profiles with progress tracking
- **Week**: Structured weekly content organization
- **WeekContent**: Individual materials and assignments
- **HomeworkSubmission**: Student submissions with tracking
- **PastPaper**: Examination papers with access control
- **StudentProgress**: Detailed progress analytics

## 🎨 UI/UX Features

### Design Elements
- **Math-themed animations** and visual effects
- **Interactive 3D elements** for mathematical concepts
- **Responsive design** for all screen sizes
- **Dark/Light mode** with persistent preferences
- **Student photo gallery** and testimonials
- **Professional color scheme** optimized for learning

### Animations & Effects
- **GSAP animations** for smooth interactions
- **Three.js 3D visualizations** for math concepts
- **Anime.js** for UI element animations
- **Custom CSS animations** for enhanced UX

## 🚀 Deployment

### Production Considerations
1. **Environment Variables**: Ensure all production secrets are configured
2. **Database**: Use MongoDB Atlas or dedicated MongoDB instance
3. **File Storage**: Configure Cloudinary for production
4. **WhatsApp API**: Set up production WhatsApp service
5. **SSL Certificate**: Implement HTTPS for security
6. **Process Management**: Use PM2 or similar for Node.js processes

### Recommended Hosting
- **Vercel** or **Netlify** for frontend deployment
- **Heroku**, **DigitalOcean**, or **AWS** for backend
- **MongoDB Atlas** for database hosting
- **Cloudinary** for media storage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Deif Mohamed**
- GitHub: [@DeifMohamed2](https://github.com/DeifMohamed2)
- Repository: [Mr. Moharr7am Platform](https://github.com/DeifMohamed2/mrmohrram.git)

## 🙏 Acknowledgments

- **Mathematics educators** for curriculum guidance
- **Students and parents** for feedback and testing
- **Open source community** for the amazing tools and libraries
- **WhatsApp API** for communication integration

## 📞 Support

For support, email [your-email@example.com] or create an issue in the repository.

---

<div align="center">
  <strong>Built with ❤️ for mathematics education</strong>
</div>
