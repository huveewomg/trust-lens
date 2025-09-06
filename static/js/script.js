// Configuration and data
const EXAMPLES = [
  `URGENT: Your account has been suspended due to unusual activity. Verify your identity within 30 minutes at http://secure-login.paypai.com to avoid permanent restriction. Do not ignore this final notice!`,
  `Congratulations! You've won a $1000 gift card. To claim, click https://bit.ly/3XyzAb and provide your bank details to process the reward.`,
  `DHL: Your package is on hold. Pay the RM9.90 customs fee now to release: https://t.co/abc123.`,
  `We detected a login from a new device. Reply with your OTP code to re-activate your account immediately.`,
  `Invest with us and GUARANTEED double your money in 7 days. Message us on WhatsApp wa.me/123456 for details.`,
  `Malaysia Post: Sorry our driver missed you today as nobody answered. To book and reschedule, please verify the address in the link within 12 hours: https://pos-my.blog/mypost`,
  `Dear Customer, you have 6,833 points expiring on 09/05!  Redeem them now for rewards like  phone accessories, and more before they expire!Click to view your options: https://maxis-my.best/mypoint`,
  `Your account is at risk! Click here to verify your identity: https://secure-login-verify.com/12345. Failure to do so will result in permanent suspension.`,
  `Job Alert: You have a new job offer! Click here to view details and confirm your interest: https://job-offer-secure.com/offer12345.`,
  `RM 0 Maybank:TQ for using your card ending 1207 for RM3590.00 @ TOMEI. NOT you?Call Maybank 0364198764 Immediately`,
  `Your 2024 tax is overdue and you have violated the Malaysian Criminal Code. Please complete the payment within 24 hours: https://mybayarw.cyou/my`,
  `Terkini :Sumbangan Tunai Rahmah (STR) fasa 3-Isi rumah pendapatan kurang 2,500 ringgit, layak terima sumbangan sehingga 3,500 ringgit bergantung kepada bilangan anak. Cara memohon: http://telegram-bantuankerajaan23.my.id/viraljawatan/16`,
  `RM0 MySejahtera: Bantuan Khas Kewangan COVID-19 sebanyak RM800 telah kredit ke TNG eWallet anda. Sila semak baki dan tuntutan anda di https://touchngo.cc`,
  `Polis Negara teleh memberi kuasa kepada anda untuk segera menjawab saman (RM300) yang dilampirkan dalam tempoh 72 jam. Jika anda gagal menjawab, kami tidak mempunyai pilihan selain mengambil tindakan undang-undang terhadap anda. Sila jawab saman anda melalui laman web: http://polis.cyou/saman`
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
  updateStatus('Analyzing with AI… <span class="spinner"></span>');

  try {
    const response = await fetch('http://127.0.0.1:8000/predict/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: text }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    // The backend returns the prediction from Vertex AI.
    const aiData = await response.json();
    render(aiData);
    updateStatus('Analysis complete.');

  } catch (error) {
    console.error('Analysis Error:', error.message);
    updateStatus('Error analyzing message. Check console for details.');
    render({ score: 0, annotated: text, findings: [{ label: 'Error', why: error.message }] });
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

function render({ score, annotated, findings }) {
  renderScore(score);
  elements.annotatedText.innerHTML = annotated || '<span class="muted">No suspicious phrases found.</span>';

  if (!findings.length) {
    elements.explanationList.innerHTML = '<li><strong>Looks low risk.</strong> No obvious scam indicators were detected.</li>';
    return;
  }

  elements.explanationList.innerHTML = findings.map(finding => {
    const badge = finding.severity === 'bad' ? '🔴' : '🟡';
    return `<li>${badge} <strong>${finding.label}</strong> — ${finding.why}</li>`;
  }).join('');
}

function renderScore(score) {
  elements.scoreBar.style.right = `${100 - score}%`;
  elements.scoreDisplay.textContent = `Score: ${score}`;
  elements.scoreDisplay.style.color = score > 70 ? 'var(--bad)' : score > 40 ? 'var(--warn)' : 'var(--good)';
}
