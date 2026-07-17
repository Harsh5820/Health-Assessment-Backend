const mongoose = require('mongoose');

const healthReportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  client_id: {
    type: Number,
    required: true
  },
  report_id: {
    type: String,
    required: true
  },
  report_date: {
    type: Date,
    required: true
  },
  hemoglobin: { type: Number },
  vitamin_d: { type: Number },
  cholesterol: { type: Number },
  blood_sugar_fasting: { type: Number },
  creatinine: { type: Number },
  urine_protein: { type: String },
  bmi: { type: Number },
  doctor_notes: { type: String }
}, {
  timestamps: true
});

healthReportSchema.index({ user: 1 });
healthReportSchema.index({ client_id: 1 });
healthReportSchema.index({ report_date: -1 });

module.exports = mongoose.model('HealthReport', healthReportSchema);
