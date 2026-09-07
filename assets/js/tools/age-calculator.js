/* ============================================
   GO TOOLLY v2.0 - AGE CALCULATOR
   ============================================ */
(function(){
'use strict';
document.addEventListener('DOMContentLoaded', function() {
    var dateInput = document.getElementById('birth-date');
    var calcBtn = document.getElementById('calculate-btn');
    var resultsArea = document.getElementById('results-area');

    var today = new Date();
    dateInput.max = today.toISOString().split('T')[0];

    calcBtn.addEventListener('click', calculateAge);
    dateInput.addEventListener('change', calculateAge);

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function calculateAge() {
        var dob = new Date(dateInput.value);
        if (isNaN(dob.getTime())) return;
        if (dob > today) { alert('Birth date cannot be in the future.'); return; }

        var years = today.getFullYear() - dob.getFullYear();
        var months = today.getMonth() - dob.getMonth();
        var days = today.getDate() - dob.getDate();

        if (days < 0) { months--; var prevMonth = new Date(today.getFullYear(), today.getMonth(), 0); days += prevMonth.getDate(); }
        if (months < 0) { years--; months += 12; }

        var totalDays = Math.floor((today - dob) / 86400000);
        var totalWeeks = Math.floor(totalDays / 7);
        var totalHours = totalDays * 24;
        var totalMinutes = totalHours * 60;
        var totalMonths = years * 12 + months;
        var totalWeeksExact = Math.floor(totalDays / 7);

        setText('r-years', years);
        setText('r-months', months);
        setText('r-days', days);
        setText('r-hours', totalHours.toLocaleString());
        setText('r-minutes', totalMinutes.toLocaleString());

        setText('d-days', totalDays.toLocaleString());
        setText('d-weeks', totalWeeks.toLocaleString());
        setText('d-months-total', totalMonths.toLocaleString());
        setText('d-weeks-total', totalWeeksExact.toLocaleString());
        setText('d-dow', dob.toLocaleDateString('en-US', { weekday: 'long' }));

        var nextBd = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        if (nextBd <= today) nextBd.setFullYear(nextBd.getFullYear() + 1);
        var daysUntil = Math.ceil((nextBd - today) / 86400000);
        setText('d-next-bd', nextBd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));

        var cdEl = document.getElementById('birthday-countdown');
        if (daysUntil === 0) {
            setText('bd-days', '0');
            setText('bd-message', 'Happy Birthday! Today is your birthday!');
        } else {
            setText('bd-days', daysUntil);
            setText('bd-message', 'days until your next birthday');
        }
        cdEl.style.display = 'block';
        resultsArea.style.display = 'block';
    }
});
})();
