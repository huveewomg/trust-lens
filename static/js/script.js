
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

const els = {
  ex: document.getElementById('examples'),
  ta: document.getElementById('message'),
  btn: document.getElementById('analyzeBtn'),
  clr: document.getElementById('clearBtn'),
  status: document.getElementById('status'),
  bar: document.getElementById('bar'),
  score: document.getElementById('score'),
  annotated: document.getElementById('annotated'),
  explain: document.getElementById('explain'),
};

// Populate example pills
EXAMPLES.forEach((msg, i) => {
  const pill = document.createElement('button');
  pill.className = 'pill';
  pill.type = 'button';
  pill.title = 'Append example to message';
  pill.textContent = `Example ${i+1}`;
  pill.addEventListener('click', () => {
  // clear message first
  els.ta.value = '';
    const prefix = els.ta.value.trim() ? '\n\n' : '';
    els.ta.value += prefix + msg;
    els.ta.focus();
  });
  els.ex.appendChild(pill);
});

els.clr.addEventListener('click', () => {
  els.ta.value = '';
  renderScore(0);
  els.annotated.textContent = 'Highlighted results will appear here…';
  els.explain.innerHTML = '<li>Run an analysis to see findings.</li>';
});

els.btn.addEventListener('click', async () => {
  const text = els.ta.value.trim();
  if (!text) {
    pulseStatus('Please paste a message first.');
    els.ta.focus();
    return;
  }
  setBusy(true);
  pulseStatus('Analyzing with AI… <span class="spinner"></span>');
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
      
      // // The backend returns the prediction from Vertex AI.
      const aiData = await response.json();

      render(aiData);
      pulseStatus('Analysis complete.');

  } catch (error) {
      console.error('Analysis Error:', error.message);
      pulseStatus('Error analyzing message. Check console for details.');
      render({ score: 0, annotated: text, findings: [{ label: 'Error', why: error.message }] });
  } finally {
      setBusy(false);
  }
});

function setBusy(b) {
  els.btn.disabled = b;
  els.clr.disabled = b;
}
function pulseStatus(html) { els.status.innerHTML = html; }
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function highlight(text, ranges) {
  if (!ranges.length) return escapeHtml(text);
  // Merge overlapping ranges, keep highest severity (bad > warn)
  ranges.sort((a,b) => a.start - b.start || b.end - a.end);
  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (!last || r.start > last.end) {
      merged.push({ ...r });
    } else {
      // overlap
      last.end = Math.max(last.end, r.end);
      if (severityRank(r.severity) > severityRank(last.severity)) last.severity = r.severity;
    }
  }
  let out = '';
  let i = 0;
  const src = text;
  for (const r of merged) {
    out += escapeHtml(src.slice(i, r.start));
    const cls = r.severity === 'bad' ? 'hl-bad' : 'hl-warn';
    out += `<span class="${cls}">` + escapeHtml(src.slice(r.start, r.end)) + '</span>';
    i = r.end;
  }
  out += escapeHtml(src.slice(i));
  return out;
}

function severityRank(s) { return s === 'bad' ? 2 : 1; }
function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c] || c)); }

function render({ score, annotated, findings }) {
  renderScore(score);
  els.annotated.innerHTML = annotated || '<span class="muted">No suspicious phrases found.</span>';
  if (!findings.length) {
    els.explain.innerHTML = '<li><strong>Looks low risk.</strong> No obvious scam indicators were detected.</li>';
    return;
  }
  els.explain.innerHTML = findings.map(f => {
    const badge = f.severity === 'bad' ? '🔴' : '🟡';
    return `<li>${badge} <strong>${f.label}</strong> — ${f.why}</li>`;
  }).join('');
}

function renderScore(score) {
  els.bar.style.right = `${100 - score}%`;
  els.score.textContent = `Score: ${score}`;
  els.score.style.color = score > 70 ? 'var(--bad)' : score > 40 ? 'var(--warn)' : 'var(--good)';
}
