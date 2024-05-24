// Create a single supabase client for interacting with your database
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://yzlkvjdkppkodpneavwl.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bGt2amRrcHBrb2RwbmVhdndsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxMTQ0ODA5NiwiZXhwIjoyMDI3MDI0MDk2fQ.pvn5m06axtpfKwAPuX4DpB2EtV1X2bJVCw1cVOaxMxQ')
const databaseName = 'subscriptions';
const frontEndUrl = 'http://localhost:5173'

const { Resend } = require('resend');
const resend = new Resend('re_M3dCKe6R_QKaoPs2RjKK19yDYjtA2fKSQ');

const cors = require('cors');
const path = require('path');
const express = require('express')

const app = express()
const port = 8000

app.use(cors())
app.use(express.json())


// FUNCTIONS

// Function for determining the smallest unused id
function findAvailableId(existingData) {
  // Check which id's are already in the supabase
  const existingIds = existingData.map(record => record.id);
  let id = 1;
  // Find the smallest unused integer for the id
  while (existingIds.includes(id)) {
      id++;
  }
  return id;
}

// Function for checking email validity
function isValidEmail(userEmail) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(userEmail);
}

// Function for getting a user's data from their email
async function getUserByEmail(email) {
  // Select a row based on the email address
  const { data, error } = await supabase
    .from(databaseName)
    .select('*')
    .eq('email', email);

  if (error) {
    // Handle error
    console.error('Error fetching user:', error.message);
    return null;
  }

  // Return the user data if found
  if (data) {
    return data[0];
  } else {
    return null;
  }
}

// Function to remove user from supabase by token
async function deleteUser(verification_token) {
  const { data, error } = await supabase
        .from(databaseName)
        .delete()
        .eq('verification_token', verification_token);
}

// Function to define mailoptions  defineMailOptions
async function sendEmail(userEmail, subject, emailContent) {
    resend.emails.send({
      from: 'onboarding@resend.dev',
      to: userEmail,
      subject: subject,
      html: emailContent
    });
}

// HTTP REQUESTS


// NEWSLETTER FORM SUBMIT 
app.post('/api/new', async (req, res) => {
    const userData = req.body;
    const userEmail = userData.email;

     // define user token
    const verification_token = Math.floor(Math.random() * 100000000);

    // existingData selects all id's in the supabase
    const { data: existingData, error } = await supabase.from(databaseName).select('id');

    // define data to send to Supabase
    const dataToSend = {
      confirmed: false,
      email: userEmail,
      name: userData.voornaam + " " + userData.achternaam,
      id: findAvailableId(existingData),
      verification_token: verification_token
    }; 
    console.log(dataToSend);

    // Check for valid email
    if (isValidEmail(userEmail) === true) {
        console.log('Email is valid: '+userEmail);
        console.log("token is: "+verification_token);
        // Insert data into supabase
        try {
          const { data, error } = await supabase
            .from(databaseName)
            .insert(dataToSend);
          
          if (error) {
            throw error;
          }  

          console.log('Data inserted successfully');
          res.status(200).json({ message: 'Data inserted successfully' });
        } catch (error) {
          console.error('Error inserting data to Supabase:', error.message);
          res.status(500).json({ error: 'Error inserting data to Supabase' });
        }

        // Define mail content
        const emailContent = `
            <p>Thank you for signing up!</p>
            <p>Please click the following link to verify your email:</p>
            <a href="${frontEndUrl}/api/verify?token=${verification_token}">Verify Email here</a>
        `;

        // Send verification mail
        sendEmail(userEmail, "Verify your email", emailContent);
        console.log("Sent verification email to "+userEmail);
    } else {
        console.log('Email is invalid');
        res.status(422).json({ message: 'Email is invalid' });
    }
});

// UNSUBSCRIBE FORM SUBMIT
app.delete('/api/unsubscribe', async (req, res) => {
  const userEmail = req.body.email;
  console.log("User email: "+userEmail)

  getUserByEmail(userEmail)
  .then(user => {
    if (user) {
      console.log('Email verified: ', user.confirmed)

      if (user.confirmed === true) {
        // Define mail content
        const emailContent = `
        <p>Click the following link to unsubscribe from our newsletter</p>
        <a href="${frontEndUrl}/api/unsubscribe?token=${user.verification_token}">Verify Email here</a>
        `;
        // send email to user with token to unsubscribe
        sendEmail(userEmail, "Confirm unsubscription", emailContent);

      } else if (user.confirmed === false) {
        // remove user from subscriptions without mail
        deleteUser(user.verification_token);
        console.log('user has been removed')

      } else {
        console.log("\'confirmed\' is neither true nor false")
      }

    } else {
      console.log('User not found');
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });
});



// old stuff
app.get('/api/subscriptions', (req, res) => {
  // Logic to fetch all e-mails
  supabase
    .from(databaseName)
    .select('*')
    .then(response => {
      //console.log(response);
      // Assuming you want to send this data back to the client
      res.status(200).json(response.data);
    })
    .catch(error => {
      console.log(error);
      res.status(500).json({message: 'Error reading from Database: ' + error.message});
    });
});

app.get('/api/verify', async (req, res) => {
  res.sendFile(path.join(__dirname, 'landing.html'))
  const verification_token = req.query.token;
  
  try {
    // Check if the row exists and its 'confirmed' value is false
    const { data: existingData, error: existingError } = await supabase
        .from(databaseName)
        .select('confirmed')
        .eq('verification_token', verification_token)
        .single();
    
    if (existingError) {
        throw existingError;
    }

    if (!existingData) {
        return res.status(404).json({ error: 'Row not found', message: 'No row found with the provided ID' });
    }

    if (!existingData.confirmed == true) {
      const { error: updateError } = await supabase
          .from(databaseName)
          .update({ confirmed: true })
          .eq('verification_token', verification_token);

      if (updateError) {
        // Handle database update error
        return res.status(500).json({ error: 'Error updating record' });
      }
      
      return res.status(200).json({ success: true });
    } else {
      console.log("Already confirmed: true");
    }
    
  } 
  catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An unexpected error occured' });
  } 
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})




