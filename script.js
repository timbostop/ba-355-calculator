const travelDateInput = document.getElementById('travel-date');
const resultDiv = document.getElementById('result');
const alreadyAvailableDiv = document.getElementById('already-available-result');
const displayTravelDateAvailable = document.getElementById('display-travel-date-available');
const bookingDateDisplay = document.getElementById('booking-date');
const availabilityDateDisplay = document.getElementById('availability-date');
const displayTravelDate = document.getElementById('display-travel-date');
const daysUntilDisplay = document.getElementById('days-until');
const addToCalendarBtn = document.getElementById('add-to-calendar');
const addToGoogleBtn = document.getElementById('add-to-google');
const privacyLink = document.getElementById('privacy-link');
const privacyModal = document.getElementById('privacy-modal');
const closeModal = document.getElementById('close-modal');
const board = document.getElementById('board');

const LONG_DATE_FORMAT = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

let currentBookingDate = null;
let currentTravelDateStr = '';

// Tomorrow is the earliest bookable travel date
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

// Furthest bookable travel date is 2 years out
const maxDate = new Date();
maxDate.setFullYear(maxDate.getFullYear() + 2);

// Default to a date 355 days out, without triggering the result
const defaultDate = new Date();
defaultDate.setDate(defaultDate.getDate() + 355);

const datePicker = flatpickr(travelDateInput, {
    dateFormat: 'Y-m-d',
    altInput: true,
    altFormat: 'd/m/Y',
    altInputClass: 'board-input',
    minDate: tomorrow,
    maxDate: maxDate,
    defaultDate: defaultDate,
    disableMobile: true,
    onChange: calculateBookingDate
});

board.addEventListener('click', function (e) {
    if (e.target.closest('button, a')) return;
    datePicker.open();
});

board.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.target.closest('button, a')) {
        e.preventDefault();
        calculateBookingDate();
    }
});

// BA releases seats at midnight GMT, or 01:00 during British Summer Time
function isBST(date) {
    const year = date.getFullYear();

    // Last Sunday in March
    const marchLastSunday = new Date(year, 2, 31);
    while (marchLastSunday.getDay() !== 0) {
        marchLastSunday.setDate(marchLastSunday.getDate() - 1);
    }
    marchLastSunday.setHours(1, 0, 0, 0);

    // Last Sunday in October
    const octoberLastSunday = new Date(year, 9, 31);
    while (octoberLastSunday.getDay() !== 0) {
        octoberLastSunday.setDate(octoberLastSunday.getDate() - 1);
    }
    octoberLastSunday.setHours(1, 0, 0, 0);

    return date >= marchLastSunday && date < octoberLastSunday;
}

// The release/call times for a given date, accounting for BST
function getCallWindow(date) {
    const inBST = isBST(date);
    return {
        inBST,
        releaseTime: inBST ? '01:00 BST' : '00:00 GMT',
        callTime: inBST ? '00:50 BST' : '23:50 GMT',
        timeZoneLabel: inBST ? 'BST (British Summer Time)' : 'GMT (Greenwich Mean Time)'
    };
}

// The exact moment to call, as a Date, 10 minutes before release
function getCallDateTime(bookingDate, inBST) {
    const eventDate = new Date(bookingDate);
    if (inBST) {
        eventDate.setHours(0, 50, 0, 0);
    } else {
        eventDate.setHours(23, 50, 0, 0);
    }
    return eventDate;
}

function formatLongDate(date) {
    return date.toLocaleDateString('en-GB', LONG_DATE_FORMAT);
}

function calculateBookingDate() {
    const travelDate = new Date(travelDateInput.value + 'T12:00:00');

    if (!travelDateInput.value) {
        resultDiv.classList.remove('show');
        alreadyAvailableDiv.classList.remove('show');
        return;
    }

    gtag('event', 'EnterADate', {});

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysToTravel = Math.round((travelDate - today) / (1000 * 60 * 60 * 24));

    if (daysToTravel < 354) {
        resultDiv.classList.remove('show');
        displayTravelDateAvailable.textContent = formatLongDate(travelDate);
        alreadyAvailableDiv.classList.add('show');
        return;
    }

    alreadyAvailableDiv.classList.remove('show');

    const availabilityDate = new Date(travelDate);
    availabilityDate.setDate(availabilityDate.getDate() - 354);

    const { inBST, releaseTime, callTime } = getCallWindow(availabilityDate);

    const callDate = new Date(travelDate);
    callDate.setDate(callDate.getDate() - 355);

    const bookingDate = inBST ? availabilityDate : callDate;
    currentBookingDate = bookingDate;
    currentTravelDateStr = travelDateInput.value;

    const daysUntil = Math.ceil((bookingDate - today) / (1000 * 60 * 60 * 24));

    bookingDateDisplay.textContent = formatLongDate(bookingDate) + ', ' + callTime;
    availabilityDateDisplay.textContent = formatLongDate(availabilityDate) + ' at ' + releaseTime;
    displayTravelDate.textContent = formatLongDate(travelDate);

    if (daysUntil < 0) {
        daysUntilDisplay.textContent = 'Already passed - seats likely taken!';
    } else if (daysUntil === 0) {
        daysUntilDisplay.textContent = `TODAY! Call at ${callTime}!`;
    } else if (daysUntil === 1) {
        daysUntilDisplay.textContent = 'Tomorrow - set your alarm!';
    } else {
        daysUntilDisplay.textContent = daysUntil + ' days';
    }

    resultDiv.classList.add('show');
}

function buildCallReminderDetails(callTime, releaseTime, timeZoneLabel, lineBreak) {
    return `Call British Airways Executive Club at ${callTime} to book award flight for ${currentTravelDateStr}.${lineBreak}${lineBreak}` +
        `Phone: 0344 493 0787 (UK) or +44 203 250 0145 (international)${lineBreak}${lineBreak}` +
        `IMPORTANT: Seats appear at ${releaseTime} (${timeZoneLabel}).${lineBreak}Stay on hold until then!${lineBreak}${lineBreak}` +
        `Note: BA releases seats at midnight GMT. During British Summer Time, this is 01:00 BST.`;
}

function formatICSDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

addToGoogleBtn.addEventListener('click', function () {
    if (!currentBookingDate) return;

    const { inBST, releaseTime, callTime, timeZoneLabel } = getCallWindow(currentBookingDate);
    const eventDate = getCallDateTime(currentBookingDate, inBST);

    const eventTitle = 'Call BA for Award Booking';
    const eventDetails = buildCallReminderDetails(callTime, releaseTime, timeZoneLabel, '\n');

    const startDateTime = formatICSDateTime(eventDate);
    const endDateTime = formatICSDateTime(new Date(eventDate.getTime() + 30 * 60000));

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
        `&text=${encodeURIComponent(eventTitle)}` +
        `&dates=${startDateTime}/${endDateTime}` +
        `&details=${encodeURIComponent(eventDetails)}` +
        `&sf=true&output=xml`;

    window.open(googleCalendarUrl, '_blank');
});

addToCalendarBtn.addEventListener('click', function () {
    if (!currentBookingDate) return;

    const { inBST, releaseTime, callTime, timeZoneLabel } = getCallWindow(currentBookingDate);
    const eventDate = getCallDateTime(currentBookingDate, inBST);

    const eventTitle = 'Call BA for Award Booking';
    const eventDetails = buildCallReminderDetails(callTime, releaseTime, timeZoneLabel, '\\n');

    const startDate = formatICSDateTime(eventDate);
    const endDate = formatICSDateTime(new Date(eventDate.getTime() + 30 * 60000));

    const icalContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//BA T-355 Calculator//EN',
        'BEGIN:VEVENT',
        `DTSTART:${startDate}`,
        `DTEND:${endDate}`,
        `SUMMARY:${eventTitle}`,
        `DESCRIPTION:${eventDetails}`,
        'BEGIN:VALARM',
        'TRIGGER:-PT15M',
        'DESCRIPTION:Reminder',
        'ACTION:DISPLAY',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = 'ba-booking-reminder.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

privacyLink.addEventListener('click', function (e) {
    e.preventDefault();
    privacyModal.classList.add('show');
});

closeModal.addEventListener('click', function () {
    privacyModal.classList.remove('show');
});

privacyModal.addEventListener('click', function (e) {
    if (e.target === privacyModal) {
        privacyModal.classList.remove('show');
    }
});
