/* ============================================
   GO TOOLLY - AGE CALCULATOR
   ============================================ */
document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.getElementById('birth-date');
    const calcBtn = document.getElementById('calculate-btn');
    const resultsArea = document.getElementById('results-area');

    var today = new Date();
    dateInput.max = today.toISOString().split('T')[0];

    calcBtn.addEventListener('click', calculateAge);
    dateInput.addEventListener('change', calculateAge);

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

        document.getElementById('r-years').textContent = years;
        document.getElementById('r-months').textContent = months;
        document.getElementById('r-days').textContent = days;
        document.getElementById('r-hours').textContent = totalHours.toLocaleString();
        document.getElementById('r-minutes').textContent = totalMinutes.toLocaleString();

        document.getElementById('d-days').textContent = totalDays.toLocaleString();
        document.getElementById('d-weeks').textContent = totalWeeks.toLocaleString();
        document.getElementById('d-hours').textContent = totalHours.toLocaleString();
        document.getElementById('d-minutes').textContent = totalMinutes.toLocaleString();
        document.getElementById('d-dow').textContent = dob.toLocaleDateString('en-US', { weekday: 'long' });
        document.getElementById('d-months-total').textContent = totalMonths.toLocaleString();
        document.getElementById('d-weeks-total').textContent = totalWeeksExact.toLocaleString();

        var nextBd = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        if (nextBd <= today) nextBd.setFullYear(nextBd.getFullYear() + 1);
        var daysUntil = Math.ceil((nextBd - today) / 86400000);
        document.getElementById('d-next-bd').textContent = nextBd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        var cdEl = document.getElementById('birthday-countdown');
        if (daysUntil === 0) {
            document.getElementById('bd-days').textContent = '0';
            document.getElementById('bd-message').textContent = 'Happy Birthday! Today is your birthday!';
        } else {
            document.getElementById('bd-days').textContent = daysUntil;
            document.getElementById('bd-message').textContent = 'days until your next birthday';
        }
        cdEl.style.display = 'block';
        resultsArea.style.display = 'block';
    }
});