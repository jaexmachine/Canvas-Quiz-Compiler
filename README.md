# Canvas Quiz Compiler

> A robust Chrome extension that records and compiles Canvas LMS quiz questions and your selected answers into an organized dashboard for offline review and study.

---

## 🚀 Features

The Canvas Quiz Compiler automates the extraction of quiz data, ensuring you have a clean record of every question and answer choice.

* **Live Session Recording**: Toggle the recording state directly within the Canvas interface to track your progress in real-time.
* **Persistent Multi-Page Support**: Maintains state as you move between questions or navigate "One Question at a Time" quizzes without losing data.
* **Smart Scraper**: Automatically identifies question text and extracts the actual text of your selected answer instead of internal database IDs.
* **Instant Live Feedback**: A floating status indicator shows exactly how many questions have been successfully recorded as you work.
* **Management Dashboard**: View, delete, or download your compiled quizzes individually or as a bulk export from the extension popup.

---

## 🛠 Installation

To load the extension in developer mode:

1. **Download** or clone this repository to your local machine.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer Mode** using the toggle in the top-right corner.
4. Click the **Load unpacked** button.
5. Select the folder containing the extension files.

---

## 📖 Usage

### Recording a Quiz

1. Navigate to any Canvas Quiz or Assignment page.
2. Click the **🔴 Start Compiling** button injected at the top of the quiz header.
3. As you select answers, the floating indicator (bottom-right) will update to show the question has been saved.
4. If you change an answer, the compiler automatically updates the record for that specific question.
5. Click **✅ Compiling... (Click to Save)** to end the session and finalize the record.

### Exporting Data

1. Open the extension popup from your browser toolbar.
2. Click **View** to review questions and answers within the popup dashboard.
3. Click **Get** to download a specific quiz as a formatted `.txt` file.
4. Use **Download All as Text** to generate a single file containing your entire compilation history.

### Keyboard Shortcuts

* **Alt+R (Option+R on Mac)**: Manually triggers a scrape of the currently visible questions.

---

## 📜 Licensing & Permissions

This project is protected under standard copyright law, **All Rights Reserved**, with the following limited permissions:

### Permitted Use

* You are permitted to modify the source code for **personal use, learning, or internal testing**.

### Prohibited Use

* You are **strictly prohibited** from distributing, re-publishing, or using this code to create a competing product.
* The original author retains all intellectual property rights to the design and implementation of the Canvas Quiz Compiler.
