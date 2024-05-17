//require('dotenv').config()
//const jwt = require('jsonwebtoken');
//var token = require('crypto-token');
//const env = process.env

// Create a single supabase client for interacting with your database
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://yzlkvjdkppkodpneavwl.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bGt2amRrcHBrb2RwbmVhdndsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxMTQ0ODA5NiwiZXhwIjoyMDI3MDI0MDk2fQ.pvn5m06axtpfKwAPuX4DpB2EtV1X2bJVCw1cVOaxMxQ')
const cors = require('cors');
const express = require('express')
const app = express()
const port = 8000
const path = require('path');
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'outlook',
  auth: {
      user: 'wpl2groep2-24@outlook.com',
      pass: 'AreYouWaterproof2.'
  }
});
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
});

app.get('/api/subscriptions', (req, res) => {
  // Logic to fetch all e-mails
  supabase
    .from('subscriptions')
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

// app.get('/api/landing', async (req, res) => {
//   res.sendFile(path.join(__dirname, 'landing.html'))
// })

app.get('/api/verify', async (req, res) => {
  res.sendFile(path.join(__dirname, 'landing.html'))
  const verification_token = req.query.token;
  
  try {
    // Check if the row exists and its 'confirmed' value is false
    const { data: existingData, error: existingError } = await supabase
        .from('subscriptions')
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
          .from('subscriptions')
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

app.post('/api/new', async (req, res) => {
    const userData = req.body;
    const userEmail = userData.email;
    const verification_token = Math.floor(Math.random() * 100000000);
    console.log("token is: "+verification_token);
    const { data: existingData, error } = await supabase.from('subscriptions').select('id');

    if (error) {
        // Handle error
        return res.status(500).json({ error: 'Error fetching data from Supabase' });
    }
    // Extract existing IDs from the fetched data
    const existingIds = existingData.map(record => record.id);
    // Find the smallest unused integer for the id
    let id = 1;
    while (existingIds.includes(id)) {
        id++;
    }

    const dataToSend = {
      confirmed: false,
      email: userEmail,
      name: userData.voornaam + " " + userData.achternaam,
      id: id,
      verification_token: verification_token
    }; 
    /*
    console.log(userData.voornaam);
    console.log(userData.achternaam);
    console.log(userData.email);
    */
    console.log("verify req received");

    try {
      const { data, error } = await supabase
        .from('subscriptions')
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

    async function isValidEmail(userEmail) {
      // Regular expression for validating email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }
  
    const emailContent = `
        <p>Thank you for signing up!</p>
        <p>Please click the following link to verify your email:</p>
        <a href="http://localhost:3000/api/verify?token=${verification_token}">Verify Email here</a>
    `;

    const mailOptions = {
        from: 'wpl2groep2-24@outlook.com',
        to: userEmail,
        subject: 'Email Verification',
        html: emailContent
    };

    // Moet nog getest worden
    const email = 'example@example.com';
    if (isValidEmail(email)) {
        console.log('Email is valid');
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
              console.error('Error sending email:', error);
          } else {
              console.log('Email sent:', info.response);
          }
        });
    } else {
        console.log('Email is invalid');
    }

});



app.delete('/api/delete', async (req, res) => {
  const { verification_token } = req.body;
  console.log("this is the token: "+verification_token);
 try {
    const { data, error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('verification_token', verification_token);
    
    if (error) {
      throw error;
    } 

    console.log('Row deleted successfully: ');
    res.status(200).json({ message: 'Row deleted successfully' });
  } 
  catch (error) {
    console.error('Error deleting row from Supabase:', error.message);
    res.status(500).json({ error: 'Error deleting row from Supabase', message: error.message });
  } 
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})


/*
import { Resend } from 'resend';

const resend = new Resend('re_Rxjymobz_7uooR1d6De2fH9RTbQBEyD6S');

resend.emails.send({
  from: 'onboarding@resend.dev',
  to: 'seth.achten@student.pxl.be',
  subject: 'Hello World',
  html: '<p>Congrats on sending your <strong>first email</strong>!</p>'
});
*/
