# 🧾 Smart Expense Splitter

A modern, intuitive React application for splitting expenses among any group of people with flexible splitting options. Perfect for trips, roommates, group dinners, or any shared expenses. Built with React, Vite, TailwindCSS, and beautiful Lucide React icons.

## 🌐 Live Demo
**[Try it live here!](https://YOUR-USERNAME.github.io/smart-expense-splitter/)**

[![Smart Expense Splitter](https://via.placeholder.com/800x400/3B82F6/FFFFFF?text=Smart+Expense+Splitter+Live+Demo)](https://YOUR-USERNAME.github.io/smart-expense-splitter/)

> **Portfolio Note**: This is a fully functional web application built as a portfolio project demonstrating modern React development, responsive design, and real-world problem solving.

## ✨ Features

### 🎯 Core Functionality
- **Dynamic Participants**: Add and remove participants - no more hardcoded names!
- **Flexible Splitting**: Choose between equal split or custom amounts based on actual usage
- **Smart Settlement**: Calculate minimum transactions needed to settle all debts
- **Real-time Calculations**: Instant balance updates and settlement recommendations
- **Custom Split Validation**: Ensures split amounts match the total expense amount

### 🎨 Enhanced User Experience
- **Compact One-Page Layout**: Everything fits on one screen with efficient two-column design
- **Interactive Dashboard**: Visual stats cards showing totals and expense counts
- **Responsive Two-Column Layout**: Left column for participants/expenses, right for input/results
- **Professional PDF Reports**: Download comprehensive settlement reports with tables
- **Real-time Validation**: Instant feedback for custom split amounts
- **Data Persistence**: Automatically saves data to browser's local storage
- **Mobile Responsive**: Adapts beautifully to all device sizes

### 🛠️ Technical Features
- **React 18** with modern hooks (useState, useEffect)
- **jsPDF & AutoTable** for professional PDF report generation
- **Vite** for fast development and building
- **TailwindCSS** for utility-first styling and responsive design
- **Lucide React** icons for beautiful UI elements
- **LocalStorage** for data persistence
- **Component-based architecture** for maintainability

## 🚀 Quick Start

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn package manager

### Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:5173` (or the URL shown in your terminal)

### Build for Production
```bash
npm run build
npm run preview
```

## 📱 How to Use

### 1. Managing Participants (Left Column)
- **Add Participants**: Enter names and click "Add" to build your group
- **Remove Participants**: Click the minus icon next to any participant (minimum 2 required)
- **Global Reach**: No more hardcoded names - use any names from anywhere in the world!
- **Quick Stats**: View total expenses and number of transactions at a glance

### 2. Adding Expenses (Right Column)
- **Select Payer**: Choose who paid for the expense from the dropdown
- **Enter Amount**: Input the total amount spent
- **Add Description**: Describe the expense (e.g., "Restaurant bill", "Gas", "Hotel")
- **Choose Split Mode**: 
  - **Equal Split**: Select participants and divide amount equally
  - **Custom Split**: Enter exact amounts for each participant based on actual usage
- **Real-time Validation**: In custom mode, see total vs allocated amounts instantly
- Click "Add Expense" to save

### 3. Split Mode Examples
- **Equal Split**: 3 friends go to dinner, bill is Rs 3000, each pays Rs 1000
- **Custom Split**: 3 friends go to restaurant:
  - Person A ate Rs 2000 worth of food
  - Person B ate Rs 1000 worth of food  
  - Person C ate Rs 1000 worth of food
  - Total bill Rs 4000 → Person B and C each owe Person A Rs 1000 and Rs 2000 respectively

### 4. Managing Expenses (Left Column)
- View all expenses in a compact scrollable list
- Each expense shows: payer, amount, split mode, individual amounts, and date
- Delete individual expenses using the trash icon
- Clear all expenses with one click

### 5. Calculating Settlement (Right Column)
- Click "Calculate Settlement" to see who owes whom
- The app minimizes the number of transactions needed
- View individual balances with color coding (green = should receive, red = should pay)
- See settled participants who don't owe or receive money
- If everyone is settled up, you'll see a celebration message!

### 6. PDF Report Generation
- **Download Professional Reports**: Click "PDF" button in the settlement summary
- **Comprehensive Tables**: Includes participant details, expense breakdown, and settlement summary
- **Professional Format**: Clean, organized layout with branded headers and footers
- **Automatic Naming**: Files saved as `expense-settlement-YYYY-MM-DD.pdf`
- **Multi-page Support**: Handles large datasets with automatic page breaks

### 7. Data Persistence
- All data (participants and expenses) automatically saved to browser's local storage
- Your data persists between browser sessions
- No data sent to external servers - complete privacy
- Reset option available to start fresh

## 🏗️ Project Structure

```
trip-expense-splitter/
├── public/
├── src/
│   ├── components/
│   │   └── ui/
│   │       ├── button.jsx
│   │       ├── card.jsx
│   │       ├── input.jsx
│   │       └── label.jsx
│   ├── lib/
│   │   └── utils.js
│   ├── index.css
│   ├── main.jsx
│   └── TripExpenseSplitter.jsx
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
└── README.md
```

## 🎯 Example Scenarios

### Scenario 1: Restaurant Bill with Custom Split
**Participants:** Alice, Bob, Charlie  
**Expense:** Alice pays Rs 4000 restaurant bill

**Custom Split:**
- Alice consumed: Rs 2000
- Bob consumed: Rs 1000  
- Charlie consumed: Rs 1000

**Result:** Bob pays Alice Rs 1000, Charlie pays Alice Rs 1000

### Scenario 2: Trip to the Mountains  
**Participants:** David, Emma, Frank

1. **Hotel** - David pays Rs 3000 (equal split among all 3)
2. **Gas** - Emma pays Rs 600 (custom split: Emma Rs 200, Frank Rs 400)  
3. **Groceries** - Frank pays Rs 900 (equal split among all 3)

**Settlement Result:** Frank pays David Rs 500, Emma pays David Rs 200

## 🛡️ Features Overview

### Smart Algorithm
- Uses an efficient debt settlement algorithm
- Minimizes the number of transactions required
- Handles floating-point precision issues
- Supports partial splitting (not everyone has to participate in every expense)

### Compact UI/UX Design
- **One-Page Layout**: Everything visible at once with efficient space usage
- **Two-Column Design**: Left for management, right for input and results
- **Responsive Layout**: Adapts seamlessly from desktop to mobile
- **Color-coded Elements**: Intuitive color coding for different information types
- **Compact Components**: Smaller buttons, inputs, and cards for space efficiency
- **Scrollable Sections**: Overflow areas for large datasets without page bloat

### PDF Report Generation
- **Professional Format**: Clean, organized PDF reports with proper formatting
- **Comprehensive Data**: Includes all expense details, split information, and settlement summary
- **Automatic Tables**: Uses jsPDF AutoTable for clean, readable table formatting
- **Multi-page Support**: Handles large datasets with automatic page breaks
- **Branded Headers**: Includes app branding and generation timestamps
- **One-Click Download**: Generate and download reports instantly

### Data Management
- **Automatic Saving**: No need to manually save data
- **Error Handling**: Validates input before adding expenses
- **Confirmation Dialogs**: Prevents accidental data loss
- **Date Tracking**: Automatically tracks when expenses were added
- **Real-time Updates**: Instant feedback and validation

## 🔧 Customization

### Changing Currency
Update the `formatCurrency` function in `src/TripExpenseSplitter.jsx`:
```javascript
const formatCurrency = (amount) => `$${amount.toFixed(2)}`;  // For USD
const formatCurrency = (amount) => `€${amount.toFixed(2)}`;  // For EUR
const formatCurrency = (amount) => `£${amount.toFixed(2)}`;  // For GBP
```

### Default Participants
Change the initial participants in `src/TripExpenseSplitter.jsx`:
```javascript
const [participants, setParticipants] = useState(["John", "Jane", "Mike"]);
```

### Modifying Colors
Edit the Tailwind classes in the component or update `tailwind.config.js` for global changes.

### Adding Split Modes
The app supports two split modes - you can extend this by modifying the `splitMode` state and adding new logic in the `addExpense` function.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🚀 Deployment

This project is automatically deployed to GitHub Pages using GitHub Actions.

### Live on GitHub Pages
- **Live URL**: [https://YOUR-USERNAME.github.io/smart-expense-splitter/](https://YOUR-USERNAME.github.io/smart-expense-splitter/)
- **Automatic Deployment**: Every push to main branch triggers a new deployment
- **Custom Domain**: Can be configured in repository settings

### Alternative Deployment Options

#### Deploy to Vercel
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Vercel will automatically build and deploy your app

#### Deploy to Netlify
1. Run `npm run build`
2. Upload the `dist` folder to Netlify
3. Your app is now live!

## 🔮 Future Enhancements

- [x] ✅ Export results to PDF (COMPLETED)
- [x] ✅ Compact one-page layout (COMPLETED)
- [x] ✅ Professional PDF reports with tables (COMPLETED)
- [ ] Export results to CSV/Excel
- [ ] Multiple currency support within same session
- [ ] Group management (save multiple group configurations)
- [ ] Expense categories and filtering
- [ ] Dark mode toggle
- [ ] Cloud sync (optional)
- [ ] Split by percentage
- [ ] Receipt photo uploads with OCR
- [ ] Trip templates and presets
- [ ] Payment tracking (mark transactions as completed)
- [ ] Recurring expenses
- [ ] Multi-language support
- [ ] Offline mode with sync when online
- [ ] Email/SMS settlement reminders
- [ ] Undo/Redo functionality
- [ ] Bulk expense import
- [ ] Expense search and filtering

---

**Made with ❤️ for making fair expense splitting simple and beautiful!** 