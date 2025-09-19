const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isLocalhost 
  ? 'http://127.0.0.1:8000/predict/' 
  : 'https://trust-lens-production.up.railway.app/predict/';
const SEMAKMULE_API_URL = 'https://trust-lens-production.up.railway.app/semakmule/';

// Configuration and data
const EXAMPLES = [
  `Congratulations! You've won a $1000 gift card. To claim, click https://bit.ly/3XyzAb and provide your bank details to process the reward.`,
  `重要通知：您的银行账户存在异常，为了避免冻结，请立即点击链接进行验证：https://tinyurl.com/bank-secure`,
  `We detected a login from a new device. Reply with your OTP code to re-activate your account immediately.`,
  `Malaysia Post: Sorry our driver missed you today as nobody answered. To book and reschedule, please verify the address in the link within 12 hours: https://pos-my.blog/mypost`,
  `รับเงินฟรี 1000 บาท! เข้าร่วมกลุ่มการลงทุนของเราตอนนี้เพื่อผลตอบแทนสูง! ติดต่อเราที่: +60163411403`,
  `Kesempatan kerja menarik! Butuh karyawan untuk pekerjaan online. Gaji tinggi, tidak perlu pengalaman. Daftar di sini: http://loker-cepat.net/`,
  `Your 2024 tax is overdue and you have violated the Malaysian Criminal Code. Please complete the payment within 24 hours: https://mybayarw.cyou/my`,
];

// DOM element references
const elements = {
  examplesContainer: document.getElementById('examples'),
  messageTextarea: document.getElementById('message'),
  analyzeButton: document.getElementById('analyzeBtn'),
  clearButton: document.getElementById('clearBtn'),
  statusElement: document.getElementById('status'),
  scoreBar: document.getElementById('bar'),
  scoreDisplay: document.getElementById('score'),
  annotatedText: document.getElementById('annotated'),
  explanationList: document.getElementById('explain'),
};

// Populate example pills
EXAMPLES.forEach((message, index) => {
  const pillButton = document.createElement('button');
  pillButton.className = 'pill';
  pillButton.type = 'button';
  pillButton.title = 'Append example to message';
  pillButton.textContent = `Example ${index + 1}`;

  pillButton.addEventListener('click', () => {
    // Clear message first
    elements.messageTextarea.value = '';
    const prefix = elements.messageTextarea.value.trim() ? '\n\n' : '';
    elements.messageTextarea.value += prefix + message;
    elements.messageTextarea.focus();
  });

  elements.examplesContainer.appendChild(pillButton);
});

// Clear button event listener
elements.clearButton.addEventListener('click', () => {
  elements.messageTextarea.value = '';
  renderScore(0);
  elements.annotatedText.textContent = 'Highlighted results will appear here…';
  elements.explanationList.innerHTML = '<li>Run an analysis to see findings.</li>';
  
  // Clear SemakMule results
  const semakMuleContainer = document.getElementById('semakMuleResults');
  semakMuleContainer.innerHTML = 'SemakMule results will appear here…';

  // Clear Summary results
  const summaryContainer = document.getElementById('summaryResults');
  summaryContainer.innerHTML = 'Summary results will appear here…';
});

// Analyze button event listener
elements.analyzeButton.addEventListener('click', async () => {
  const text = elements.messageTextarea.value.trim();
  if (!text) {
    updateStatus('Please paste a message first.');
    elements.messageTextarea.focus();
    return;
  }

  setBusyState(true);
  updateStatus('Analyzing with AI and SemakMule… <span class="spinner"></span>');

  try {
    // Extract phone numbers for SemakMule API
    const phoneNumber = extractPhoneNumber(text);
    
    // Create parallel API calls
    const apiCalls = [
      // Main AI analysis
      fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text }),
      }),
    ];

    // Add SemakMule API call if phone number found
    if (phoneNumber !== null) {
      apiCalls.push(
        fetch(SEMAKMULE_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ number: phoneNumber }),
        })
      );
    }

    // Execute both API calls in parallel
    const responses = await Promise.allSettled(apiCalls);

    // Process main AI analysis response
    const mainResponse = responses[0];
    if (mainResponse.status === 'fulfilled' && mainResponse.value.ok) {
      const aiData = await mainResponse.value.json();
      render(aiData);
    } else {
      const error = mainResponse.status === 'rejected' ? mainResponse.reason : 
        await mainResponse.value.json().catch(() => ({ detail: `HTTP error! status: ${mainResponse.value.status}` }));
      throw new Error(error.detail || error.message || 'AI Analysis failed');
    }

    // Process SemakMule response if it was called
    if (responses.length > 1) {
      const semakMuleResponse = responses[1];
      if (semakMuleResponse.status === 'fulfilled' && semakMuleResponse.value.ok) {
        const semakMuleData = await semakMuleResponse.value.json();
        populateSemakMule(semakMuleData);
      } else {
        console.warn('SemakMule API failed:', semakMuleResponse.reason || 'Network error');
        populateSemakMule(null); // Show "no data" message
      }
    } else {
      // No phone numbers found, show appropriate message
      const semakMuleContainer = document.getElementById('semakMuleResults');
      semakMuleContainer.innerHTML = 'No phone numbers detected in the message.';
    }

    updateStatus('Analysis complete.');

  } catch (error) {
    console.error('Analysis Error:', error.message);
    updateStatus('Error analyzing message. Check console for details.');
    render({ score: 0, annotated: text, findings: [{ label: 'Error', why: error.message }] });
    populateSemakMule(null);
  } finally {
    setBusyState(false);
  }
});

// Utility functions
function setBusyState(isBusy) {
  elements.analyzeButton.disabled = isBusy;
  elements.clearButton.disabled = isBusy;
}

function updateStatus(html) {
  elements.statusElement.innerHTML = html;
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

// Extract phone numbers from text
function extractPhoneNumber(text) {
  // Find all potential phone numbers that start with +, 6, or 0
  const potentialNumbers = text.match(/[+60]\d+/g) || [];
  const validNumbers = [];
  
  for (let number of potentialNumbers) {
    // Remove any non-digit characters
    let cleanNumber = number.replace(/\D/g, '');
    
    // Remove leading 6 if present
    if (cleanNumber.startsWith('6')) {
      cleanNumber = cleanNumber.substring(1);
    }
    
    // Test against Malaysian phone regex
    const phoneRegex = /^(?:011\d{8}|01[2-9]\d{7}|03\d{7})$/;
    if (phoneRegex.test(cleanNumber)) {
      validNumbers.push(cleanNumber);
    }
  }
  
  if (validNumbers.length > 0) {
    return validNumbers[0]; // Return the first valid number found
  } else {
    return null;
  }
}

// Text highlighting and processing functions
function highlight(text, ranges) {
  if (!ranges.length) return escapeHtml(text);

  // Merge overlapping ranges, keeping highest severity (bad > warn)
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged = [];

  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end) {
      merged.push({ ...range });
    } else {
      // Handle overlap
      last.end = Math.max(last.end, range.end);
      if (severityRank(range.severity) > severityRank(last.severity)) {
        last.severity = range.severity;
      }
    }
  }

  let output = '';
  let currentIndex = 0;
  const sourceText = text;

  for (const range of merged) {
    output += escapeHtml(sourceText.slice(currentIndex, range.start));
    const cssClass = range.severity === 'bad' ? 'hl-bad' : 'hl-warn';
    output += `<span class="${cssClass}">` + escapeHtml(sourceText.slice(range.start, range.end)) + '</span>';
    currentIndex = range.end;
  }

  output += escapeHtml(sourceText.slice(currentIndex));
  return output;
}

function severityRank(severity) {
  return severity === 'bad' ? 2 : 1;
}

function escapeHtml(text) {
  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, char => htmlEntities[char] || char);
}

function render({ score, annotated, findings, summary }) {

  renderScore(score);
  elements.annotatedText.innerHTML = annotated
    ? highlightAnnotated(annotated)
    : '<span class="muted">No suspicious phrases found.</span>';

  if (!findings.length) {
    elements.explanationList.innerHTML = '<li><strong>Looks low risk.</strong> No obvious scam indicators were detected.</li>';
    return;
  }

  elements.explanationList.innerHTML = findings.map(finding => {
    const badge = finding.severity === 'bad' ? '🔴' : '🟡';
    return `<li>${badge} <strong>${finding.label}</strong> — ${finding.why}</li>`;
  }).join('');

  // Render summary if provided
  if (summary) {
    renderSummary(summary);
  }
}

// Highlight <bad> and <warn> tags in annotated text
function highlightAnnotated(text) {
  const txt = document.createElement('textarea');
  txt.innerHTML = text;
  let decoded = txt.value;
  return decoded
    .replace(/<bad>([\s\S]*?)<\/bad>/gi, '<span class="hl-bad">$1</span>')
    .replace(/<warn>([\s\S]*?)<\/warn>/gi, '<span class="hl-warn">$1</span>')
    .replace(/\(bad\)([\s\S]*?)\(\/bad\)/gi, '<span class="hl-bad">$2</span>')
    .replace(/\(warn\)([\s\S]*?)\(\/warn\)/gi, '<span class="hl-warn">$2</span>');
}

function renderScore(score) {
  elements.scoreBar.style.right = `${100 - score}%`;
  elements.scoreDisplay.textContent = `Score: ${score}`;
  elements.scoreDisplay.style.color = score > 70 ? 'var(--bad)' : score > 40 ? 'var(--warn)' : 'var(--good)';
}

function populateSemakMule(result) {
  const semakMuleContainer = document.getElementById('semakMuleResults');
  semakMuleContainer.innerHTML = ''; // Clear previous results
  
  if (!result || !result.table_data || result.table_data.length === 0) {
    semakMuleContainer.innerHTML = 'No SemakMule data found for this phone number.';
    return;
  }
  
  result.table_data.forEach(([phoneNumber, reportCount]) => {
    semakMuleContainer.innerHTML += `<strong>${phoneNumber}</strong> is reported <span style="color: var(--bad); font-weight: bold;">${reportCount} times</span>`;
  });
}

function renderSummary(summary) {
  const summaryContainer = document.getElementById('summaryResults');
  summaryContainer.innerHTML = ''; // Clear previous results

  if (!summary || summary.length === 0) {
    summaryContainer.innerHTML = 'No summary data found.';
    return;
  }
  // Create summary display
  summaryContainer.innerHTML = `${summary}`;
}
