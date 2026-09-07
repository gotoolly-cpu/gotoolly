/* ============================================
   GO TOOLLY v2.0 - LOAN CALCULATOR
   ============================================ */
(function(){
'use strict';
document.addEventListener('DOMContentLoaded', function() {
    var amount = document.getElementById('lc-amount');
    var rate = document.getElementById('lc-rate');
    var term = document.getElementById('lc-term');
    var calcBtn = document.getElementById('lc-calculate-btn');
    var resultsDiv = document.getElementById('lc-results');
    var monthlyEl = document.getElementById('lc-monthly');
    var totalInterestEl = document.getElementById('lc-total-interest');
    var totalRepaymentEl = document.getElementById('lc-total-repayment');
    var scheduleDiv = document.getElementById('lc-schedule');
    var scheduleBody = document.getElementById('lc-schedule-body');
    var copyBtn = document.getElementById('lc-copy-btn');
    var printBtn = document.getElementById('lc-print-btn');
    var clearBtn = document.getElementById('lc-clear-btn');

    function calculateLoan() {
        var P = parseFloat(amount.value);
        var annualRate = parseFloat(rate.value);
        var years = parseFloat(term.value);

        if (isNaN(P) || isNaN(annualRate) || isNaN(years) || P <= 0 || annualRate < 0 || years <= 0) {
            resultsDiv.style.display = 'none';
            scheduleDiv.style.display = 'none';
            return;
        }

        var r = (annualRate / 100) / 12;
        var n = years * 12;

        var monthly;
        if (r === 0) {
            monthly = P / n;
        } else {
            monthly = P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        }

        var totalRepayment = monthly * n;
        var totalInterest = totalRepayment - P;

        monthlyEl.textContent = formatCurrency(monthly);
        totalInterestEl.textContent = formatCurrency(totalInterest);
        totalRepaymentEl.textContent = formatCurrency(totalRepayment);
        resultsDiv.style.display = 'grid';

        buildAmortizationSchedule(P, r, n, monthly);
        scheduleDiv.style.display = 'block';
    }

    function buildAmortizationSchedule(P, r, n, monthly) {
        scheduleBody.innerHTML = '';
        var balance = P;
        var totalPrincipal = 0;
        var totalInterestPaid = 0;

        for (var i = 1; i <= n; i++) {
            var interestPayment;
            var principalPayment;
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

            var row = document.createElement('tr');
            row.innerHTML = '<td>' + i + '</td>' +
                '<td>' + formatCurrency(monthly) + '</td>' +
                '<td>' + formatCurrency(principalPayment) + '</td>' +
                '<td>' + formatCurrency(interestPayment) + '</td>' +
                '<td>' + formatCurrency(balance) + '</td>';
            scheduleBody.appendChild(row);
        }

        var totalRow = document.createElement('tr');
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
        var text = 'Monthly Payment: ' + monthlyEl.textContent +
            '\nTotal Interest: ' + totalInterestEl.textContent +
            '\nTotal Repayment: ' + totalRepaymentEl.textContent;
        var done = function() {
            copyBtn.textContent = 'Copied!';
            setTimeout(function() { copyBtn.textContent = 'Copy Results'; }, 1500);
        };
        copyText(text, done);
    });

    function copyText(text, done) {
        var fallback = function () {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.top = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (e) {}
            ta.remove();
            done();
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, fallback);
        } else {
            fallback();
        }
    }

    printBtn.addEventListener('click', function() {
        if (resultsDiv.style.display === 'none') return;
        var printContent = document.getElementById('lc-schedule');
        if (!printContent) return;
        var originalContents = document.body.innerHTML;
        var printStyles = Array.prototype.slice.call(document.styleSheets).map(function(sheet) {
            try {
                return sheet.cssText ? '<style>' + sheet.cssText + '</style>' : '';
            } catch(e) { return ''; }
        }).join('');

        var summary = '<div style="text-align:center;margin-bottom:20px">' +
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
})();
