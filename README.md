# 💰 Personal Finance Tracker

A comprehensive full-stack web application for managing personal finances with AI-powered assistance.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🌟 Features

- 📊 **Interactive Dashboard** - Real-time financial overview with charts
- 💸 **Transaction Management** - Track income and expenses with categories
- 🎯 **Budget Tracking** - Set budgets and monitor spending with alerts
- 🏆 **Savings Goals** - Create and track financial goals
- 🔔 **Bill Reminders** - Never miss a payment with smart reminders
- 🤖 **AI Chatbot** - Get personalized financial advice and insights
- 🔐 **Secure Authentication** - JWT-based login system
- 📱 **Responsive Design** - Works on all devices

---

## 🛠️ Tech Stack

**Frontend:** React, Tailwind CSS, Recharts, Axios  
**Backend:** Node.js, Express, MongoDB, Mongoose  
**Authentication:** JWT, Bcrypt  
**AI:** Custom rule-based chatbot (OpenAI integration ready)

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- MongoDB (local or Atlas)
- npm

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/personal-finance-tracker.git
cd personal-finance-tracker
```

2. **Setup Backend**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

3. **Setup Frontend** (in new terminal)
```bash
cd frontend
npm install
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
npm start
```

4. **Open browser** → `http://localhost:3000`

---

## ⚙️ Configuration

### Backend `.env`
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/financialtracker
JWT_SECRET=your_super_secret_key
NODE_ENV=development
```

### Frontend `.env`
```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 📁 Project Structure

```
finance-tracker/
├── backend/
│   ├── controllers/         # Business logic
│   ├── models/             # Database schemas
│   ├── routes/             # API endpoints
│   ├── middleware/         # Auth & validation
│   ├── utils/              # Helper functions
│   └── server.js           # Express server
│
└── frontend/
    ├── src/
    │   ├── components/     # React components
    │   ├── context/        # State management
    │   ├── services/       # API calls
    │   └── App.js          # Main component
    └── package.json
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Transactions
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Budgets
- `GET /api/budgets` - Get all budgets
- `POST /api/budgets` - Create budget
- `GET /api/budgets/with-spending` - Get budgets with spending data

### Goals
- `GET /api/goals` - Get all goals
- `POST /api/goals` - Create goal
- `PATCH /api/goals/:id/progress` - Update goal progress

### Bills
- `GET /api/bills` - Get all bills
- `POST /api/bills` - Create bill
- `GET /api/bills/upcoming` - Get upcoming bills
- `PATCH /api/bills/:id/paid` - Mark bill as paid

### Chatbot
- `POST /api/chat/message` - Send message to AI assistant

All endpoints (except auth) require JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 📊 Database Schema

**Collections:** Users, Transactions, Budgets, Goals, Bills

**Key Relationships:**
- All collections reference Users via `user` field
- Mongoose automatically manages relationships

---

## 🤖 AI Chatbot Features

The chatbot understands:
- "Show me my spending" → Returns spending summary
- "How are my budgets?" → Returns budget status
- "What bills are due?" → Shows upcoming bills
- "Help with saving" → Provides financial tips
- "My goal progress" → Shows savings goal status

== LATER TO BE INTERGRATED WITH CHATGPT OPENAI ==

---

## 🔒 Security

- ✅ JWT authentication with 7-day expiration
- ✅ Bcrypt password hashing (12 rounds)
- ✅ Input validation and sanitization
- ✅ Protected API routes
- ✅ CORS configuration
- ✅ MongoDB injection prevention

---

## 🚢 Deployment

### Backend (Heroku)
```bash
heroku create your-app-name
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set JWT_SECRET=your_secret
git push heroku main
```

### Frontend (Vercel)
```bash
npm install -g vercel
vercel
# Follow prompts
```

### Database (MongoDB Atlas)
1. Create free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Get connection string
3. Update `MONGODB_URI` in backend

---

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

---

## 🔧 Common Issues

**MongoDB Connection Error:**
- Ensure MongoDB is running
- Check MONGODB_URI in .env
- For Atlas: whitelist your IP

**Port Already in Use:**
```bash
# Kill process on port 5000
lsof -i :5000  # Find PID
kill -9 <PID>  # Kill process
```

**CORS Error:**
- Verify REACT_APP_API_URL in frontend .env
- Check backend CORS configuration
- Ensure backend is running

---

## 📝 Usage Example

```javascript
// Register user
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}

// Add expense
POST /api/transactions
Headers: { Authorization: "Bearer <token>" }
{
  "type": "expense",
  "amount": 50.00,
  "category": "food",
  "description": "Groceries",
  "date": "2024-01-15"
}

// Create budget
POST /api/budgets
Headers: { Authorization: "Bearer <token>" }
{
  "category": "food",
  "amount": 500.00,
  "period": "monthly"
}
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👤 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

---

## 🙏 Acknowledgments

- React documentation
- MongoDB documentation
- Tailwind CSS
- Recharts library
- OpenAI (for future AI integration)

---

## 📞 Support

- 📧 Email: mathiasnzioka0@gmail.com
- 💬 Discord: [Join our community](#)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/personal-finance-tracker/issues)

---

<div align="center">

**Made with ❤️ for better financial management**

⭐ Star this repo if you find it helpful!

</div>
