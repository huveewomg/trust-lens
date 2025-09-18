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
  `รับเงินฟรี 1000 บาท! เข้าร่วมกลุ่มการลงทุนของเราตอนนี้เพื่อผลตอบแทนสูง! ติดต่อเราที่: +66912345678`,
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
    const phoneNumbers = extractPhoneNumbers(text);
    
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

    // Add SemakMule API call if phone numbers found
    if (phoneNumbers.length > 0) {
      apiCalls.push(
        fetch(SEMAKMULE_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone_numbers: phoneNumbers }),
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
      semakMuleContainer.innerHTML = '<div class="muted">No phone numbers detected in the message.</div>';
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
function extractPhoneNumbers(text) {
  // Malaysian phone number patterns
  const patterns = [
    /(?:\+?6?01[0-9][-\s]?[0-9]{3,4}[-\s]?[0-9]{4})/g, // Malaysian mobile
    /(?:\+?6?03[-\s]?[0-9]{4}[-\s]?[0-9]{4})/g, // KL landline
    /(?:\+?6?0[4-9][-\s]?[0-9]{3,4}[-\s]?[0-9]{4})/g, // Other Malaysian numbers
    /(?:\+?6?[0-9]{2,3}[-\s]?[0-9]{3,4}[-\s]?[0-9]{4})/g, // General Malaysian format
    /(?:[0-9]{10,11})/g, // Simple 10-11 digit numbers
  ];
  
  const phoneNumbers = new Set();
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Clean the number (remove spaces, dashes, plus signs)
        const cleanNumber = match.replace(/[-\s+]/g, '');
        // Add Malaysian prefix if missing and number looks Malaysian
        if (cleanNumber.length >= 9 && cleanNumber.length <= 12) {
          if (cleanNumber.startsWith('6')) {
            phoneNumbers.add(cleanNumber);
          } else if (cleanNumber.startsWith('0')) {
            phoneNumbers.add('6' + cleanNumber);
          } else if (cleanNumber.length === 10 || cleanNumber.length === 11) {
            phoneNumbers.add(cleanNumber);
          }
        }
      });
    }
  });
  
  return Array.from(phoneNumbers);
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
    const phoneDiv = document.createElement('div');
    phoneDiv.innerHTML = `<strong>${phoneNumber}</strong> is reported <span style="color: var(--bad); font-weight: bold;">${reportCount} times</span>`;
    semakMuleContainer.appendChild(phoneDiv);
  });
  
  semakMuleContainer.appendChild(resultDiv);
}

function renderSummary(summary) {
  const summaryContainer = document.getElementById('summaryResults');
  summaryContainer.innerHTML = ''; // Clear previous results

  if (!summary || summary.length === 0) {
    summaryContainer.innerHTML = 'No summary data found.';
    return;
  }
  // Create summary display
  const summaryDiv = document.createElement('div');
  summaryDiv.innerHTML = `${summary}`;
  summaryContainer.appendChild(summaryDiv);
}
