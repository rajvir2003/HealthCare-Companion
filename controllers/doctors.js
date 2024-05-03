import express from 'express';
import passport from 'passport';
import db from './db'; 


const router = express.Router();


router.post('/login', passport.authenticate('local', {
  successRedirect: '/doctor/dashboard',
  failureRedirect: '/doctor/login',
  failureFlash: true 
}));


// Route to view pending appointments
router.get('/appointments/pending', async (req, res) => {
  try {
    const pendingAppointments = await db.query("SELECT * FROM appointments WHERE doctor_id = $1 AND status = 'pending'", [req.user.id]);
    res.render('pending_appointments', { appointments: pendingAppointments });
  } catch (error) {
    console.error("Error fetching pending appointments:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

// Route to accept or reject appointments
router.post('/appointments/:appointmentId', async (req, res) => {
  const appointmentId = req.params.appointmentId;
  const action = req.body.action; // 'accept' or 'reject'

  try {
    // Update appointment status in the database
    await db.query("UPDATE appointments SET status = $1 WHERE id = $2", [action, appointmentId]);
    res.redirect('/doctor/appointments/pending');
  } catch (error) {
    console.error("Error updating appointment status:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

// Export the router
export default router;
