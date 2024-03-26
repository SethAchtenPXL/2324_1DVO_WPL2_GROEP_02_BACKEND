const { createClient } = require('@supabase/supabase-js');
// Create a single supabase client for interacting with your database
const supabase = createClient('https://xltvurziufjfokvpqnnw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsdHZ1cnppdWZqZm9rdnBxbm53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxMTQ1NDAyMSwiZXhwIjoyMDI3MDMwMDIxfQ.pUk0wzqvrSd2g961qEDmoKqYvwEcSexAuNQwFT6O3jg')
const express = require('express')
const app = express()
const port = 3000
app.get('/', (req, res) => {
 res.send('Hello World!')
})

app.get('/api/subscriptions', (req, res) => {
    // Logic to fetch all e-mails
    supabase
    .from('subscriptions')
    .select('*')
    .then(response => {
    console.log(response);
    // Assuming you want to send this data back to the client
    res.status(200).json(response.data);
    })
    .catch(error => {
    console.log(error);
    res.status(500).json({message: 'Error reading from Database: ' +
   error.message});
    });
   });
app.listen(port, () => {
 console.log(`Example app listening on port ${port}`)
})