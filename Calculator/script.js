const currentDisplay = document.getElementById('current-operand');
const previousDisplay = document.getElementById('previous-operand');
const livePreviewDisplay = document.getElementById('live-preview');
const buttons = document.querySelectorAll('.btn');

let currentOperand = '0';
let previousOperand = '';
let operation = undefined;
let shouldResetScreen = false;

function clear() {
    currentOperand = '0';
    previousOperand = '';
    operation = undefined;
}

function deleteNumber() {
    if (currentOperand === 'Error') {
        clear();
        return;
    }
    if (currentOperand.length === 1 || (currentOperand.length === 2 && currentOperand.startsWith('-'))) {
        currentOperand = '0';
    } else {
        currentOperand = currentOperand.slice(0, -1);
    }
}

function appendNumber(number) {
    if (currentOperand === 'Error') clear();
    if (number === '.' && currentOperand.includes('.')) return;
    if (currentOperand === '0' && number !== '.') {
        currentOperand = number;
    } else if (shouldResetScreen) {
        currentOperand = number;
        shouldResetScreen = false;
    } else {
        currentOperand += number;
    }
}

function chooseOperation(op) {
    if (currentOperand === 'Error') clear();
    if (currentOperand === '' && op === '-') {
        currentOperand = '-';
        return;
    }
    if (currentOperand === '' || currentOperand === '-') return;
    if (previousOperand !== '') {
        compute();
    }
    operation = op;
    previousOperand = currentOperand;
    currentOperand = '';
}

function compute() {
    let computation;
    const prev = parseFloat(previousOperand);
    const current = parseFloat(currentOperand);
    
    if (isNaN(prev) || isNaN(current)) return;

    switch (operation) {
        case '+':
            computation = prev + current;
            break;
        case '-':
            computation = prev - current;
            break;
        case '×':
        case '*':
            computation = prev * current;
            break;
        case '÷':
        case '/':
            if (current === 0) {
                currentOperand = 'Error';
                previousOperand = '';
                operation = undefined;
                return;
            }
            computation = prev / current;
            break;
        default:
            return;
    }
    
    // Fix floating point precision issues (e.g., 0.1 + 0.2 = 0.30000000000000004)
    computation = Math.round(computation * 10000000000) / 10000000000;
    
    currentOperand = computation.toString();
    operation = undefined;
    previousOperand = '';
    shouldResetScreen = true;
}

function getDisplayNumber(number) {
    if (number === 'Error') return number;
    if (number === '-') return '-';
    
    const stringNumber = number.toString();
    const integerDigits = parseFloat(stringNumber.split('.')[0]);
    const decimalDigits = stringNumber.split('.')[1];
    let integerDisplay;
    
    if (isNaN(integerDigits)) {
        integerDisplay = '';
    } else {
        integerDisplay = integerDigits.toLocaleString('en', { maximumFractionDigits: 0 });
    }
    
    if (decimalDigits != null) {
        return `${integerDisplay}.${decimalDigits}`;
    } else {
        return integerDisplay;
    }
}

function calculatePreview() {
    if (operation != null && previousOperand !== '' && currentOperand !== '' && currentOperand !== '-') {
        const prev = parseFloat(previousOperand);
        const current = parseFloat(currentOperand);
        if (isNaN(prev) || isNaN(current)) return '';
        let computation;
        switch (operation) {
            case '+': computation = prev + current; break;
            case '-': computation = prev - current; break;
            case '×':
            case '*': computation = prev * current; break;
            case '÷':
            case '/': 
                if (current === 0) return 'Error';
                computation = prev / current; 
                break;
            default: return '';
        }
        // Fix floating point precision issues
        computation = Math.round(computation * 10000000000) / 10000000000;
        return '=' + getDisplayNumber(computation.toString());
    }
    return '';
}

function updateDisplay() {
    currentDisplay.innerText = getDisplayNumber(currentOperand);
    if (operation != null) {
        let opSymbol = operation;
        if (opSymbol === '*') opSymbol = '×';
        if (opSymbol === '/') opSymbol = '÷';
        previousDisplay.innerText = `${getDisplayNumber(previousOperand)} ${opSymbol}`;
    } else {
        previousDisplay.innerText = '';
    }
    livePreviewDisplay.innerText = calculatePreview();
}

buttons.forEach(button => {
    button.addEventListener('click', () => {
        handleInteraction(button);
    });
});

function handleInteraction(button) {
    if (button.classList.contains('btn-number')) {
        appendNumber(button.dataset.number);
    } else if (button.dataset.action === 'operator') {
        chooseOperation(button.innerText);
    } else if (button.dataset.action === 'clear') {
        clear();
    } else if (button.dataset.action === 'delete') {
        deleteNumber();
    } else if (button.dataset.action === 'calculate') {
        compute();
        animateResult();
    }
    updateDisplay();
}

// Keyboard support
window.addEventListener('keydown', (e) => {
    let key = e.key;
    
    if ((key >= '0' && key <= '9') || key === '.') {
        appendNumber(key);
        updateDisplay();
        highlightButton(document.querySelector(`[data-number="${key}"]`));
    }
    if (key === '+' || key === '-' || key === '*' || key === '/') {
        let op = key;
        if (key === '*') op = '×';
        if (key === '/') op = '÷';
        chooseOperation(op);
        updateDisplay();
        
        // Find operator button for highlighting
        const operatorBtns = document.querySelectorAll('.btn-operator');
        const targetBtn = Array.from(operatorBtns).find(b => {
           if(key === '*') return b.innerText === '×';
           if(key === '/') return b.innerText === '÷';
           return b.innerText === key;
        });
        if(targetBtn) highlightButton(targetBtn);
    }
    if (key === 'Enter' || key === '=') {
        e.preventDefault();
        compute();
        updateDisplay();
        animateResult();
        highlightButton(document.querySelector('[data-action="calculate"]'));
    }
    if (key === 'Backspace') {
        deleteNumber();
        updateDisplay();
        highlightButton(document.querySelector('[data-action="delete"]'));
    }
    if (key === 'Escape' || key === 'Delete') {
        clear();
        updateDisplay();
        highlightButton(document.querySelector('[data-action="clear"]'));
    }
});

function highlightButton(button) {
    if (!button) return;
    button.classList.add('active-keyboard');
    setTimeout(() => {
        button.classList.remove('active-keyboard');
    }, 100);
}

function animateResult() {
    currentDisplay.classList.remove('result-pop');
    void currentDisplay.offsetWidth; // trigger reflow
    currentDisplay.classList.add('result-pop');
}

// Initial display setup
updateDisplay();
