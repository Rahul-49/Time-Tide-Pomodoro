const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/timetide', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function cleanupDuplicates() {
  try {
    console.log('Connected to MongoDB');
    
    // Find all users
    const users = await User.find({});
    console.log(`Found ${users.length} users`);
    
    // Check for duplicate usernames
    const usernameMap = new Map();
    const duplicates = [];
    
    for (const user of users) {
      if (usernameMap.has(user.username)) {
        duplicates.push(user);
        console.log(`Duplicate username found: ${user.username} (ID: ${user._id})`);
      } else {
        usernameMap.set(user.username, user);
      }
    }
    
    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} duplicate usernames`);
      
      // Update duplicate usernames
      for (let i = 0; i < duplicates.length; i++) {
        const user = duplicates[i];
        const newUsername = `${user.username}${i + 1}`;
        
        try {
          await User.findByIdAndUpdate(user._id, { username: newUsername });
          console.log(`Updated user ${user._id} username to: ${newUsername}`);
        } catch (error) {
          console.error(`Failed to update user ${user._id}:`, error.message);
        }
      }
    } else {
      console.log('No duplicate usernames found');
    }
    
    console.log('Cleanup completed');
  } catch (error) {
    console.error('Cleanup error:', error);
  } finally {
    mongoose.connection.close();
  }
}

cleanupDuplicates();
