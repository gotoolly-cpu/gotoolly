document.addEventListener('DOMContentLoaded', function() {
    const amount = document.getElementById('lc-amount');
    const rate = document.getElementById('lc-rate');
    const term = document.getElementById('lc-term');
    const calcBtn = document.getElementById('lc-calculate-btn');
    const resultsDiv = document.getElementById('lc-results');
    const monthlyEl = document.getElementById('lc-monthly');
    const totalInterestEl = document.getElementById('lc-total-interest');
    const totalRepaymentEl = document.getElementById('lc-total-repayment');
    const scheduleDiv = document.getElementById('lc-schedule');
    const scheduleBody = document.getElementById('lc-schedule-body');
    const copyBtn = document.getElementById('lc-copy-btn');
    const printBtn = document.getElementById('lc-print-btn');
    const clearBtn = document.getElementById('lc-clear-btn');

    function calculateLoan() {
        const P = parseFloat(amount.value);
        const annualRate = parseFloat(rate.value);
        const years = parseFloat(term.value);

        if (isNaN(P) || isNaN(annualRate) || isNaN(years) || P <= 0 || annualRate < 0 || years <= 0) {
            resultsDiv.style.display = 'none';
            scheduleDiv.style.display = 'none';
            return;
        }

        const r = (annualRate / 100) / 12;
        const n = years * 12;

        let monthly;
        if (r === 0) {
            monthly = P / n;
        } else {
            monthly = P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        }

        const totalRepayment = monthly * n;
        const totalInterest = totalRepayment - P;

        monthlyEl.textContent = formatCurrency(monthly);
        totalInterestEl.textContent = formatCurrency(totalInterest);
        totalRepaymentEl.textContent = formatCurrency(totalRepayment);
        resultsDiv.style.display = 'grid';

        buildAmortizationSchedule(P, r, n, monthly);
        scheduleDiv.style.display = 'block';
    }

    function buildAmortizationSchedule(P, r, n, monthly) {
        scheduleBody.innerHTML = '';
        let balance = P;
        let totalPrincipal = 0;
        let totalInterestPaid = 0;

        for (let i = 1; i <= n; i++) {
            let interestPayment;
            let principalPayment;
            if (r === 0) {
                interestPayment = 0;
                principalPayment = P / n;
            } else {
                interestPayment = balance * r;
                principalPayment = monthly - interestPayment;
            }
            balance -= principalPayment;
            if (balance < 0) balance = 0;

            totalPrincipal += principalPayment;
            totalInterestPaid += interestPayment;

            const row = document.createElement('tr');
            row.innerHTML = '<td>' + i + '</td>' +
                '<td>' + formatCurrency(monthly) + '</td>' +
                '<td>' + formatCurrency(principalPayment) + '</td>' +
                '<td>' + formatCurrency(interestPayment) + '</td>' +
                '<td>' + formatCurrency(balance) + '</td>';
            scheduleBody.appendChild(row);
        }

        const totalRow = document.createElement('tr');
        totalRow.className = 'total-row';
        totalRow.innerHTML = '<td>Total</td>' +
            '<td>' + formatCurrency(monthly * n) + '</td>' +
            '<td>' + formatCurrency(totalPrincipal) + '</td>' +
            '<td>' + formatCurrency(totalInterestPaid) + '</td>' +
            '<td>$0.00</td>';
        scheduleBody.appendChild(totalRow);
    }

    function formatCurrency(val) {
        if (isNaN(val) || !isFinite(val)) return '$0.00';
        return '$' + val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    calcBtn.addEventListener('click', calculateLoan);

    [amount, rate, term].forEach(function(el) {
        el.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') calculateLoan();
        });
    });

    copyBtn.addEventListener('click', function() {
        if (resultsDiv.style.display === 'none') return;
        const text = 'Monthly Payment: ' + monthlyEl.textContent +
            '\nTotal Interest: ' + totalInterestEl.textContent +
            '\nTotal Repayment: ' + totalRepaymentEl.textContent;
        navigator.clipboard.writeText(text).then(function() {
            copyBtn.textContent = 'Copied!';
            setTimeout(function() { copyBtn.textContent = 'Copy Results'; }, 1500);
        });
    });

    printBtn.addEventListener('click', function() {
        if (resultsDiv.style.display === 'none') return;
        const printContent = document.getElementById('lc-schedule');
        if (!printContent) return;
        const originalContents = document.body.innerHTML;
        const printStyles = Array.from(document.styleSheets).map(function(sheet) {
            try {
                return sheet.cssText ? '<style>' + sheet.cssText + '</style>' : '';
            } catch(e) { return ''; }
        }).join('');

        const summary = '<div style="text-align:center;margin-bottom:20px">' +
            '<h1>Loan Calculator Results</h1>' +
            '<p>Loan Amount: ' + formatCurrency(parseFloat(amount.value)) + '</p>' +
            '<p>Annual Rate: ' + rate.value + '%</p>' +
            '<p>Term: ' + term.value + ' years</p>' +
            '<p>Monthly Payment: ' + monthlyEl.textContent + '</p>' +
            '<p>Total Interest: ' + totalInterestEl.textContent + '</p>' +
            '<p>Total Repayment: ' + totalRepaymentEl.textContent + '</p>' +
            '</div>';

        document.body.innerHTML = printStyles + summary + printContent.outerHTML;
        window.print();
        document.body.innerHTML = originalContents;
        location.reload();
    });

    clearBtn.addEventListener('click', function() {
        amount.value = '';
        rate.value = '';
        term.value = '';
        resultsDiv.style.display = 'none';
        scheduleDiv.style.display = 'none';
    });
});
