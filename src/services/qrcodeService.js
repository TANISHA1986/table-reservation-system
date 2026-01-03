const QRCode = require('qrcode');

/**
 * Generate QR code for reservation
 * Contains booking verification data
 */
const generateReservationQR = async (reservation) => {
  try {
    const qrData = {
      bookingId: reservation._id.toString(),
      tableNumber: reservation.tableId.tableNumber,
      date: reservation.date,
      time: `${reservation.startTime} - ${reservation.endTime}`,
      guests: reservation.guestCount,
      status: reservation.status,
      verificationCode: generateVerificationCode(reservation._id.toString())
    };

    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 1,
      margin: 2,
      color: {
        dark: '#0A1128',
        light: '#FFFFFF'
      },
      width: 400
    });

    return {
      success: true,
      qrCode: qrCodeDataURL,
      verificationCode: qrData.verificationCode
    };
  } catch (error) {
    console.error('QR Code generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generate unique verification code
 */
const generateVerificationCode = (bookingId) => {
  const crypto = require('crypto');
  return crypto
    .createHash('sha256')
    .update(bookingId + process.env.JWT_SECRET)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();
};

/**
 * Verify QR code data
 */
const verifyQRCode = (qrData) => {
  try {
    const data = JSON.parse(qrData);
    const expectedCode = generateVerificationCode(data.bookingId);
    
    return {
      valid: data.verificationCode === expectedCode,
      bookingId: data.bookingId
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid QR code'
    };
  }
};

module.exports = {
  generateReservationQR,
  verifyQRCode,
  generateVerificationCode
};
