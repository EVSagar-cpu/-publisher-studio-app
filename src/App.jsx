import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Download,
  FileText,
  Image as ImageIcon,
  LayoutTemplate,
  Loader2,
  Paintbrush,
  Plus,
  Printer,
  Save,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react';

const PAPER_SIZES = {
  A4: { width: 210, height: 297, label: 'A4' },
  A5: { width: 148, height: 210, label: 'A5' },
  Letter: { width: 216, height: 279, label: 'Letter' },
  Legal: { width: 216, height: 356, label: 'Legal' },
  Custom: { width: 210, height: 297, label: 'Custom' },
};

const TYPE_STYLES = [
  { id: 'classic', label: 'Classic Publisher', font: 'Georgia, "Times New Roman", serif' },
  { id: 'modern', label: 'Modern Learning', font: '"Trebuchet MS", "Segoe UI", sans-serif' },
  { id: 'scholarly', label: 'Scholarly', font: '"Palatino Linotype", Palatino, serif' },
];

const INITIAL_PAGE_CONFIG = {
  paperSize: 'A4',
  orientation: 'portrait',
  marginTop: 16,
  marginRight: 16,
  marginBottom: 18,
  marginLeft: 16,
  customWidth: 210,
  customHeight: 297,
  accent: '#bf4c2f',
};

const INITIAL_PROJECT = {
  title: 'Untitled Chapter',
  subtitle: 'Premium textbook layout workspace',
  subject: 'Science',
  grade: 'Grade 6',
  chapterNumber: '01',
  publisher: 'Your Publishing House',
};

const STORAGE_KEY = 'publisher-studio-app-v1';

function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function inlineMarkdown(value = '') {
  return escapeHtml(value)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>');
}

function markdownToHtml(markdown = '') {
  const lines = markdown.split('\n');
  let html = '';
  let listMode = null;

  const closeList = () => {
    if (listMode) {
      html += `</${listMode}>`;
      listMode = null;
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      html += '<div class="print-spacer"></div>';
      return;
    }
    if (/^###\s+/.test(trimmed)) {
      closeList();
      html += `<h3>${escapeHtml(trimmed.replace(/^###\s+/, ''))}</h3>`;
      return;
    }
    if (/^##\s+/.test(trimmed)) {
      closeList();
      html += `<h2>${escapeHtml(trimmed.replace(/^##\s+/, ''))}</h2>`;
      return;
    }
    if (/^#\s+/.test(trimmed)) {
      closeList();
      html += `<h1>${escapeHtml(trimmed.replace(/^#\s+/, ''))}</h1>`;
      return;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      if (listMode !== 'ol') {
        closeList();
        listMode = 'ol';
        html += '<ol>';
      }
      html += `<li>${inlineMarkdown(trimmed.replace(/^\d+\.\s+/, ''))}</li>`;
      return;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      if (listMode !== 'ul') {
        closeList();
        listMode = 'ul';
        html += '<ul>';
      }
      html += `<li>${inlineMarkdown(trimmed.replace(/^[-*]\s+/, ''))}</li>`;
      return;
    }
    if (/^>\s+/.test(trimmed)) {
      closeList();
      html += `<blockquote>${inlineMarkdown(trimmed.replace(/^>\s+/, ''))}</blockquote>`;
      return;
    }
    if (/^---+$/.test(trimmed)) {
      closeList();
      html += '<hr />';
      return;
    }
    closeList();
    html += `<p>${inlineMarkdown(trimmed)}</p>`;
  });

  closeList();
  return html;
}

function stripMarkdown(value = '') {
  return value
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .trim();
}

function splitIntoSections(rawText = '') {
  const text = rawText.replace(/\r/g, '').trim();
  if (!text) return [];

  const lines = text.split('\n').map((line) => line.trimEnd());
  const sections = [];
  let current = null;

  const pushCurrent = () => {
    if (current && current.body.trim()) {
      sections.push({
        id: uid('section'),
        heading: current.heading.trim(),
        body: current.body.trim(),
      });
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    const isHeading =
      /^chapter\b/i.test(trimmed) ||
      /^lesson\b/i.test(trimmed) ||
      /^unit\b/i.test(trimmed) ||
      /^topic\b/i.test(trimmed) ||
      /^summary\b/i.test(trimmed) ||
      /^exercise\b/i.test(trimmed) ||
      /^activity\b/i.test(trimmed) ||
      /^worksheet\b/i.test(trimmed) ||
      /^assessment\b/i.test(trimmed) ||
      /^learning outcome/i.test(trimmed) ||
      /^#{1,6}\s+/.test(trimmed) ||
      (/^[A-Z0-9][A-Z0-9\s&,:()-]{3,}$/.test(trimmed) && trimmed.length < 80);

    if (isHeading) {
      pushCurrent();
      current = {
        heading: trimmed.replace(/^#{1,6}\s+/, ''),
        body: '',
      };
      return;
    }

    if (!current) {
      current = { heading: 'Imported Content', body: '' };
    }

    current.body += `${trimmed}\n`;
  });

  pushCurrent();

  if (!sections.length && text) {
    return [{ id: uid('section'), heading: 'Imported Content', body: text }];
  }

  return sections;
}

function createBlock(type, source = {}) {
  const base = {
    id: uid('block'),
    type,
    title: '',
    content: '',
    sourceSectionId: '',
    sourceImageId: '',
    align: 'left',
  };

  switch (type) {
    case 'cover':
      return { ...base, title: source.title || 'Chapter Title', content: source.subtitle || 'Subtitle or teaser text' };
    case 'heading':
      return { ...base, title: 'Section Heading' };
    case 'text':
      return { ...base, content: 'Add or bind textbook body copy here.' };
    case 'callout':
      return { ...base, title: 'Did You Know?', content: 'Insert side-note, fact box, or classroom insight.' };
    case 'image':
      return { ...base, title: 'Image caption', imageFit: 'contain' };
    case 'quote':
      return { ...base, content: 'Insert highlighted quote or definition.' };
    case 'pagebreak':
      return { ...base };
    default:
      return base;
  }
}

function getPaperDimensions(config) {
  const chosen = PAPER_SIZES[config.paperSize] || PAPER_SIZES.A4;
  let width = config.paperSize === 'Custom' ? Number(config.customWidth) || 210 : chosen.width;
  let height = config.paperSize === 'Custom' ? Number(config.customHeight) || 297 : chosen.height;
  if (config.orientation === 'landscape') [width, height] = [height, width];
  return { width, height };
}

function buildPrintHtml({ project, pageConfig, blocks, sections, images, theme }) {
  const paper = getPaperDimensions(pageConfig);
  const sectionMap = new Map(sections.map((section) => [section.id, section]));
  const imageMap = new Map(images.map((image) => [image.id, image]));

  const blockHtml = blocks
    .map((block, index) => {
      const boundSection = sectionMap.get(block.sourceSectionId);
      const boundImage = imageMap.get(block.sourceImageId);

      if (block.type === 'pagebreak') return '<div class="publisher-pagebreak"></div>';

      if (block.type === 'cover') {
        return `
          <section class="publisher-block publisher-cover">
            <div class="cover-kicker">Chapter ${escapeHtml(project.chapterNumber)}</div>
            <h1>${escapeHtml(block.title || project.title)}</h1>
            <p class="cover-subtitle">${escapeHtml(block.content || project.subtitle)}</p>
            <div class="cover-meta">${escapeHtml(project.subject)} • ${escapeHtml(project.grade)} • ${escapeHtml(project.publisher)}</div>
          </section>
        `;
      }

      if (block.type === 'heading') {
        return `<section class="publisher-block"><h2 style="text-align:${block.align};">${escapeHtml(block.title || boundSection?.heading || `Section ${index + 1}`)}</h2></section>`;
      }

      if (block.type === 'text') {
        const copy = block.sourceSectionId ? boundSection?.body || '' : block.content || '';
        return `<section class="publisher-block publisher-text" style="text-align:${block.align};">${markdownToHtml(copy)}</section>`;
      }

      if (block.type === 'callout') {
        const copy = block.sourceSectionId ? boundSection?.body || '' : block.content || '';
        return `
          <section class="publisher-block publisher-callout">
            <div class="callout-label">${escapeHtml(block.title || 'Classroom Note')}</div>
            <div>${markdownToHtml(copy)}</div>
          </section>
        `;
      }

      if (block.type === 'quote') {
        const copy = block.sourceSectionId ? boundSection?.body || '' : block.content || '';
        return `<section class="publisher-block publisher-quote"><blockquote>${escapeHtml(stripMarkdown(copy))}</blockquote></section>`;
      }

      if (block.type === 'image' && boundImage) {
        return `
          <section class="publisher-block publisher-image">
            <img src="${boundImage.url}" alt="${escapeHtml(boundImage.name)}" style="object-fit:${block.imageFit || 'contain'};" />
            <figcaption>${escapeHtml(block.title || boundImage.name || 'Illustration')}</figcaption>
          </section>
        `;
      }

      return '';
    })
    .join('');

  return `<!doctype html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(project.title)}</title>
      <style>
        @page {
          size: ${paper.width}mm ${paper.height}mm;
          margin: ${pageConfig.marginTop}mm ${pageConfig.marginRight}mm ${pageConfig.marginBottom}mm ${pageConfig.marginLeft}mm;
        }
        * { box-sizing: border-box; }
        body { margin: 0; color: #1f2937; font-family: ${theme.font}; background: #f4efe8; }
        .publisher-shell {
          max-width: ${paper.width}mm;
          margin: 0 auto;
          background: white;
          min-height: 100vh;
          padding: ${pageConfig.marginTop}mm ${pageConfig.marginRight}mm ${pageConfig.marginBottom}mm ${pageConfig.marginLeft}mm;
        }
        .publisher-bar {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 14px 18px;
          margin: 18px auto;
          width: min(100%, 1100px);
          border-radius: 18px;
          background: rgba(16, 24, 40, 0.9);
          color: white;
        }
        .publisher-bar button {
          border: none;
          border-radius: 999px;
          padding: 10px 16px;
          cursor: pointer;
          background: ${pageConfig.accent};
          color: white;
          font: inherit;
        }
        .publisher-block { margin-bottom: 18px; page-break-inside: avoid; break-inside: avoid; }
        h1, h2, h3, p, ul, ol, blockquote { margin-top: 0; }
        h1 { font-size: 34px; line-height: 1.1; margin-bottom: 12px; }
        h2 { font-size: 24px; margin-bottom: 10px; color: #14213d; }
        h3 { font-size: 18px; margin-bottom: 8px; color: #334155; }
        p, li { font-size: 12pt; line-height: 1.75; }
        ul, ol { padding-left: 22px; }
        hr { border: none; border-top: 1px solid #d4c6b9; margin: 18px 0; }
        code { background: #f3efe8; padding: 2px 6px; border-radius: 4px; }
        .print-spacer { height: 10px; }
        .publisher-cover {
          min-height: 45vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          border: 1px solid #eadfd3;
          border-radius: 26px;
          padding: 28px;
          background: radial-gradient(circle at top right, rgba(191, 76, 47, 0.18), transparent 32%), linear-gradient(180deg, rgba(255,247,237,0.95), white 70%);
        }
        .cover-kicker {
          display: inline-flex;
          width: fit-content;
          margin-bottom: 16px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(191, 76, 47, 0.12);
          color: ${pageConfig.accent};
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .cover-subtitle { max-width: 75%; font-size: 16px; color: #475569; }
        .cover-meta {
          margin-top: 18px;
          font-size: 12px;
          color: #64748b;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .publisher-callout {
          border-left: 5px solid ${pageConfig.accent};
          border-radius: 18px;
          padding: 18px 20px;
          background: #fbf6f1;
        }
        .callout-label {
          margin-bottom: 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: ${pageConfig.accent};
        }
        .publisher-quote blockquote {
          margin: 0;
          padding: 18px 22px;
          border-radius: 18px;
          background: #14213d;
          color: white;
          font-size: 18px;
          line-height: 1.6;
        }
        .publisher-image { text-align: center; }
        .publisher-image img {
          width: 100%;
          max-height: 320px;
          border-radius: 18px;
          border: 1px solid #e7d8cb;
        }
        .publisher-image figcaption { margin-top: 8px; font-size: 11px; color: #64748b; }
        .publisher-pagebreak { page-break-after: always; break-after: page; height: 0; }
        @media print {
          body { background: white; }
          .publisher-bar { display: none; }
          .publisher-shell { max-width: none; min-height: auto; margin: 0; }
        }
      </style>
    </head>
    <body>
      <div class="publisher-bar">
        <button onclick="window.print()">Print / Save as PDF</button>
        <button onclick="window.close()">Close</button>
        <span>${escapeHtml(project.title)}</span>
      </div>
      <div class="publisher-shell">${blockHtml}</div>
    </body>
  </html>`;
}

export default function App() {
  const [project, setProject] = useState(INITIAL_PROJECT);
  const [pageConfig, setPageConfig] = useState(INITIAL_PAGE_CONFIG);
  const [themeId, setThemeId] = useState('classic');
  const [sourceText, setSourceText] = useState('');
  const [sections, setSections] = useState([]);
  const [images, setImages] = useState([]);
  const [blocks, setBlocks] = useState(() => [createBlock('cover', INITIAL_PROJECT)]);
  const [activeBlockId, setActiveBlockId] = useState('');
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState('Import your chapter and start building the final textbook pages.');
  const [pdfReady, setPdfReady] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const activeBlock = useMemo(() => blocks.find((block) => block.id === activeBlockId) || null, [activeBlockId, blocks]);
  const theme = TYPE_STYLES.find((item) => item.id === themeId) || TYPE_STYLES[0];

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.project) setProject(parsed.project);
      if (parsed.pageConfig) setPageConfig(parsed.pageConfig);
      if (parsed.themeId) setThemeId(parsed.themeId);
      if (parsed.sourceText) setSourceText(parsed.sourceText);
      if (parsed.sections) setSections(parsed.sections);
      if (parsed.images) setImages(parsed.images);
      if (parsed.blocks?.length) {
        setBlocks(parsed.blocks);
        setActiveBlockId(parsed.blocks[0].id);
      }
    } catch (error) {
      console.error('Failed to restore local draft', error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ project, pageConfig, themeId, sourceText, sections, images, blocks }));
  }, [blocks, images, pageConfig, project, sections, sourceText, themeId]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => setPdfReady(true);
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!activeBlockId && blocks.length) setActiveBlockId(blocks[0].id);
  }, [activeBlockId, blocks]);

  const updateBlock = (id, updates) => {
    setBlocks((current) => current.map((block) => (block.id === id ? { ...block, ...updates } : block)));
  };

  const addBlock = (type) => {
    const block = createBlock(type, project);
    setBlocks((current) => [...current, block]);
    setActiveBlockId(block.id);
  };

  const removeBlock = (id) => {
    setBlocks((current) => current.filter((block) => block.id !== id));
    if (activeBlockId === id) setActiveBlockId('');
  };

  const moveBlock = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const copy = [...blocks];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    setBlocks(copy);
  };

  const applyStarterTemplate = (kind) => {
    if (kind === 'chapter') {
      const nextBlocks = [
        createBlock('cover', project),
        { ...createBlock('heading'), title: 'Learning Objectives' },
        createBlock('callout'),
        { ...createBlock('heading'), title: 'Main Explanation' },
        createBlock('text'),
        createBlock('image'),
        { ...createBlock('heading'), title: 'Summary' },
        createBlock('quote'),
      ];
      setBlocks(nextBlocks);
      setActiveBlockId(nextBlocks[0].id);
      setStatus('Chapter template applied. Bind each block to imported sections as needed.');
      return;
    }

    const nextBlocks = [
      createBlock('cover', project),
      { ...createBlock('heading'), title: 'Warm-up' },
      createBlock('text'),
      { ...createBlock('heading'), title: 'Activities' },
      createBlock('callout'),
      { ...createBlock('heading'), title: 'Assessment' },
      createBlock('text'),
    ];
    setBlocks(nextBlocks);
    setActiveBlockId(nextBlocks[0].id);
    setStatus('Workbook template applied.');
  };

  const autoBuildFromSections = () => {
    if (!sections.length) {
      setStatus('Import a source document first so the app can generate blocks from its sections.');
      return;
    }
    const nextBlocks = [createBlock('cover', project)];
    sections.forEach((section, index) => {
      nextBlocks.push({ ...createBlock('heading'), title: section.heading || `Section ${index + 1}`, sourceSectionId: section.id });
      nextBlocks.push({ ...createBlock('text'), sourceSectionId: section.id });
      if (images[index]) {
        nextBlocks.push({ ...createBlock('image'), sourceImageId: images[index].id, title: images[index].name || section.heading });
      }
    });
    setBlocks(nextBlocks);
    setActiveBlockId(nextBlocks[0].id);
    setStatus(`Built ${nextBlocks.length} blocks from your imported chapter.`);
  };

  const handleProjectField = (field, value) => {
    setProject((current) => ({ ...current, [field]: value }));
  };

  const handlePageField = (field, value) => {
    setPageConfig((current) => ({ ...current, [field]: value }));
  };

  const parseDocx = async (file) => {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const parsePdf = async (file) => {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(' ');
      pages.push(pageText);
    }
    return pages.join('\n\n');
  };

  const handleDocumentImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setStatus(`Importing ${file.name}...`);
    try {
      let text = '';
      const name = file.name.toLowerCase();
      if (name.endsWith('.docx')) {
        text = await parseDocx(file);
      } else if (name.endsWith('.pdf')) {
        text = await parsePdf(file);
      } else if (name.endsWith('.txt') || name.endsWith('.md')) {
        text = await file.text();
      } else {
        throw new Error('Please upload a PDF, DOCX, TXT, or Markdown file.');
      }

      const nextSections = splitIntoSections(text);
      setSourceText(text);
      setSections(nextSections);
      setStatus(`Imported ${file.name}. Found ${nextSections.length} section(s).`);

      if (nextSections[0]?.heading && project.title === INITIAL_PROJECT.title) {
        setProject((current) => ({ ...current, title: nextSections[0].heading }));
      }
    } catch (error) {
      console.error(error);
      setStatus(error.message || 'Document import failed.');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleImageImport = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const nextImages = await Promise.all(files.map(async (file) => ({ id: uid('img'), name: file.name, url: URL.createObjectURL(file) })));
    setImages((current) => [...current, ...nextImages]);
    setStatus(`Added ${nextImages.length} image asset(s).`);
    event.target.value = '';
  };

  const exportHtml = useMemo(
    () => buildPrintHtml({ project, pageConfig, blocks, sections, images, theme }),
    [blocks, images, pageConfig, project, sections, theme],
  );

  const handlePrintPreview = () => {
    const printWindow = window.open('', '_blank', 'width=1280,height=900');
    if (!printWindow) {
      setStatus('Pop-up blocked. Please allow pop-ups for print preview.');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(exportHtml);
    printWindow.document.close();
  };

  const handleExportWord = () => {
    const blob = new Blob([exportHtml], { type: 'application/msword;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${project.title || 'textbook-layout'}.doc`;
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus('Word export downloaded.');
  };

  const handleExportPdf = async () => {
    if (!window.html2pdf) {
      handlePrintPreview();
      setStatus('PDF helper is still loading, so print preview was opened instead.');
      return;
    }
    const paper = getPaperDimensions(pageConfig);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = exportHtml;
    const element = wrapper.querySelector('.publisher-shell');
    if (!element) {
      setStatus('Could not prepare the print layout.');
      return;
    }
    await window.html2pdf()
      .set({
        filename: `${project.title || 'textbook-layout'}.pdf`,
        margin: 0,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: {
          unit: 'mm',
          format: [paper.width, paper.height],
          orientation: pageConfig.orientation === 'landscape' ? 'landscape' : 'portrait',
        },
        pagebreak: { mode: ['css', 'legacy'] },
      })
      .from(element)
      .save();
    setStatus('PDF export downloaded.');
  };

  const saveTemplateJson = () => {
    const blob = new Blob([JSON.stringify({ project, pageConfig, themeId, sections, blocks }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${project.title || 'textbook-template'}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus('Template JSON saved.');
  };

  const blockLabel = {
    cover: 'Cover',
    heading: 'Heading',
    text: 'Text',
    callout: 'Callout',
    image: 'Image',
    quote: 'Quote',
    pagebreak: 'Page Break',
  };

  return (
    <div className="studio-app">
      <aside className="studio-sidebar">
        <div className="brand">
          <div className="brand-mark">
            <BookOpen size={22} />
          </div>
          <div>
            <h1>Publisher Studio</h1>
            <p>New standalone app. No database. No dependency on your production product.</p>
          </div>
        </div>

        <section className="panel">
          <div className="panel-heading">
            <span>Source Import</span>
            {importing && <Loader2 className="spin" size={16} />}
          </div>
          <button className="action wide" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} />
            Import chapter file
          </button>
          <input ref={fileInputRef} hidden type="file" accept=".docx,.pdf,.txt,.md" onChange={handleDocumentImport} />
          <button className="ghost wide" onClick={() => imageInputRef.current?.click()}>
            <ImageIcon size={16} />
            Add fallback images
          </button>
          <input ref={imageInputRef} hidden type="file" accept="image/*" multiple onChange={handleImageImport} />
          <p className="micro-copy">
            DOCX gives the cleanest results. PDF works for text extraction, and you can upload lesson images separately if the original file structure is messy.
          </p>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <span>Template Builder</span>
            <LayoutTemplate size={16} />
          </div>
          <div className="template-grid">
            <button className="mini-card" onClick={() => applyStarterTemplate('chapter')}>
              <Sparkles size={18} />
              Chapter layout
            </button>
            <button className="mini-card" onClick={() => applyStarterTemplate('workbook')}>
              <Wand2 size={18} />
              Workbook layout
            </button>
            <button className="mini-card" onClick={autoBuildFromSections}>
              <Paintbrush size={18} />
              Auto-build from content
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <span>Export</span>
            <Download size={16} />
          </div>
          <div className="stack-actions">
            <button className="action wide" onClick={handlePrintPreview}>
              <Printer size={16} />
              Print preview
            </button>
            <button className="action wide" onClick={handleExportPdf}>
              <FileText size={16} />
              Download PDF
            </button>
            <button className="ghost wide" onClick={handleExportWord}>
              <Download size={16} />
              Download Word
            </button>
            <button className="ghost wide" onClick={saveTemplateJson}>
              <Save size={16} />
              Save template JSON
            </button>
            {!pdfReady && <p className="micro-copy">PDF helper is loading in the background.</p>}
          </div>
        </section>

        <section className="status-card">
          <div className="status-dot" />
          <p>{status}</p>
        </section>
      </aside>

      <main className="studio-main">
        <section className="top-grid">
          <div className="panel hero-panel">
            <div className="hero-copy">
              <span className="eyebrow">Project Metadata</span>
              <h2>Build textbook pages without touching your production app.</h2>
              <p>
                This app is fully standalone and browser-based. Your content stays local in the browser unless you choose to export files or host the static app yourself.
              </p>
            </div>

            <div className="form-grid">
              <label>
                Chapter title
                <input value={project.title} onChange={(event) => handleProjectField('title', event.target.value)} />
              </label>
              <label>
                Subtitle
                <input value={project.subtitle} onChange={(event) => handleProjectField('subtitle', event.target.value)} />
              </label>
              <label>
                Subject
                <input value={project.subject} onChange={(event) => handleProjectField('subject', event.target.value)} />
              </label>
              <label>
                Grade
                <input value={project.grade} onChange={(event) => handleProjectField('grade', event.target.value)} />
              </label>
              <label>
                Chapter no.
                <input value={project.chapterNumber} onChange={(event) => handleProjectField('chapterNumber', event.target.value)} />
              </label>
              <label>
                Publisher
                <input value={project.publisher} onChange={(event) => handleProjectField('publisher', event.target.value)} />
              </label>
              <label>
                Theme
                <select value={themeId} onChange={(event) => setThemeId(event.target.value)}>
                  {TYPE_STYLES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Accent color
                <input type="color" value={pageConfig.accent} onChange={(event) => handlePageField('accent', event.target.value)} />
              </label>
            </div>
          </div>

          <div className="panel config-panel">
            <div className="panel-heading">
              <span>Page Configuration</span>
              <Printer size={16} />
            </div>
            <div className="form-grid compact">
              <label>
                Paper size
                <select value={pageConfig.paperSize} onChange={(event) => handlePageField('paperSize', event.target.value)}>
                  {Object.entries(PAPER_SIZES).map(([key, size]) => (
                    <option key={key} value={key}>
                      {size.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Orientation
                <select value={pageConfig.orientation} onChange={(event) => handlePageField('orientation', event.target.value)}>
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </label>
              {pageConfig.paperSize === 'Custom' && (
                <>
                  <label>
                    Width (mm)
                    <input type="number" value={pageConfig.customWidth} onChange={(event) => handlePageField('customWidth', event.target.value)} />
                  </label>
                  <label>
                    Height (mm)
                    <input type="number" value={pageConfig.customHeight} onChange={(event) => handlePageField('customHeight', event.target.value)} />
                  </label>
                </>
              )}
              <label>
                Margin top
                <input type="number" value={pageConfig.marginTop} onChange={(event) => handlePageField('marginTop', event.target.value)} />
              </label>
              <label>
                Margin right
                <input type="number" value={pageConfig.marginRight} onChange={(event) => handlePageField('marginRight', event.target.value)} />
              </label>
              <label>
                Margin bottom
                <input type="number" value={pageConfig.marginBottom} onChange={(event) => handlePageField('marginBottom', event.target.value)} />
              </label>
              <label>
                Margin left
                <input type="number" value={pageConfig.marginLeft} onChange={(event) => handlePageField('marginLeft', event.target.value)} />
              </label>
            </div>
          </div>
        </section>

        <section className="workbench-grid">
          <div className="panel source-panel">
            <div className="panel-heading">
              <span>Imported Sections</span>
              <span className="count-pill">{sections.length}</span>
            </div>
            {!sections.length && <p className="empty">Your imported chapter sections will appear here.</p>}
            {sections.map((section) => (
              <article key={section.id} className="source-card">
                <h3>{section.heading}</h3>
                <p>{stripMarkdown(section.body).slice(0, 180) || 'No preview yet.'}</p>
              </article>
            ))}
          </div>

          <div className="panel builder-panel">
            <div className="panel-heading">
              <span>Template Blocks</span>
              <div className="inline-tools">
                {['cover', 'heading', 'text', 'callout', 'image', 'quote', 'pagebreak'].map((type) => (
                  <button key={type} className="pill-button" onClick={() => addBlock(type)}>
                    <Plus size={14} />
                    {blockLabel[type]}
                  </button>
                ))}
              </div>
            </div>
            <div className="block-list">
              {blocks.map((block, index) => (
                <button key={block.id} className={`block-item ${activeBlockId === block.id ? 'active' : ''}`} onClick={() => setActiveBlockId(block.id)}>
                  <div>
                    <strong>{blockLabel[block.type]}</strong>
                    <span>{block.title || (block.sourceSectionId ? sections.find((section) => section.id === block.sourceSectionId)?.heading : '') || 'No label yet'}</span>
                  </div>
                  <div className="item-actions">
                    <button onClick={(event) => { event.stopPropagation(); moveBlock(index, -1); }}>↑</button>
                    <button onClick={(event) => { event.stopPropagation(); moveBlock(index, 1); }}>↓</button>
                    <button onClick={(event) => { event.stopPropagation(); removeBlock(block.id); }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="panel inspector-panel">
            <div className="panel-heading">
              <span>Block Inspector</span>
              <Sparkles size={16} />
            </div>
            {!activeBlock && <p className="empty">Select a block to edit its content and bindings.</p>}
            {activeBlock && (
              <div className="editor-stack">
                {activeBlock.type !== 'pagebreak' && (
                  <label>
                    Label / title
                    <input value={activeBlock.title || ''} onChange={(event) => updateBlock(activeBlock.id, { title: event.target.value })} />
                  </label>
                )}

                {!['cover', 'pagebreak', 'image'].includes(activeBlock.type) && (
                  <label>
                    Bind to imported section
                    <select value={activeBlock.sourceSectionId || ''} onChange={(event) => updateBlock(activeBlock.id, { sourceSectionId: event.target.value })}>
                      <option value="">Manual content</option>
                      {sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.heading}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {activeBlock.type === 'image' && (
                  <label>
                    Image asset
                    <select value={activeBlock.sourceImageId || ''} onChange={(event) => updateBlock(activeBlock.id, { sourceImageId: event.target.value })}>
                      <option value="">Select image</option>
                      {images.map((image) => (
                        <option key={image.id} value={image.id}>
                          {image.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {activeBlock.type === 'image' && (
                  <label>
                    Image fit
                    <select value={activeBlock.imageFit || 'contain'} onChange={(event) => updateBlock(activeBlock.id, { imageFit: event.target.value })}>
                      <option value="contain">Contain</option>
                      <option value="cover">Cover</option>
                    </select>
                  </label>
                )}

                {!['image', 'pagebreak'].includes(activeBlock.type) && (
                  <label>
                    Alignment
                    <select value={activeBlock.align || 'left'} onChange={(event) => updateBlock(activeBlock.id, { align: event.target.value })}>
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </label>
                )}

                {!['heading', 'pagebreak', 'image'].includes(activeBlock.type) && (
                  <label>
                    Manual content
                    <textarea
                      rows={activeBlock.type === 'cover' ? 4 : 10}
                      value={activeBlock.content || ''}
                      onChange={(event) => updateBlock(activeBlock.id, { content: event.target.value })}
                    />
                  </label>
                )}

                {activeBlock.type === 'heading' && (
                  <label>
                    Heading text
                    <input value={activeBlock.title || ''} onChange={(event) => updateBlock(activeBlock.id, { title: event.target.value })} />
                  </label>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="panel preview-panel">
          <div className="panel-heading">
            <span>Live Layout Preview</span>
            <span className="count-pill">{blocks.length} block(s)</span>
          </div>
          <div className="preview-sheet" style={{ '--accent': pageConfig.accent, fontFamily: theme.font }}>
            <div className="preview-cover-meta">
              <span>{project.subject}</span>
              <span>{project.grade}</span>
              <span>{project.publisher}</span>
            </div>
            <h1>{project.title}</h1>
            <p>{project.subtitle}</p>
            <div className="preview-flow">
              {blocks.map((block) => {
                const section = sections.find((item) => item.id === block.sourceSectionId);
                const image = images.find((item) => item.id === block.sourceImageId);

                if (block.type === 'pagebreak') return <div key={block.id} className="preview-pagebreak">Page Break</div>;
                if (block.type === 'cover') {
                  return (
                    <section key={block.id} className="preview-card preview-cover-card">
                      <div className="cover-chip">Chapter {project.chapterNumber}</div>
                      <h2>{block.title || project.title}</h2>
                      <p>{block.content || project.subtitle}</p>
                    </section>
                  );
                }
                if (block.type === 'heading') return <h2 key={block.id}>{block.title || section?.heading || 'Section heading'}</h2>;
                if (block.type === 'text') {
                  return <section key={block.id} className="preview-card"><div dangerouslySetInnerHTML={{ __html: markdownToHtml(block.sourceSectionId ? section?.body || '' : block.content || '') }} /></section>;
                }
                if (block.type === 'callout') {
                  return <section key={block.id} className="preview-card preview-callout"><strong>{block.title || 'Callout'}</strong><div dangerouslySetInnerHTML={{ __html: markdownToHtml(block.sourceSectionId ? section?.body || '' : block.content || '') }} /></section>;
                }
                if (block.type === 'quote') {
                  return <blockquote key={block.id} className="preview-quote">{stripMarkdown(block.sourceSectionId ? section?.body || '' : block.content || '')}</blockquote>;
                }
                if (block.type === 'image') {
                  return (
                    <figure key={block.id} className="preview-figure">
                      {image ? <img src={image.url} alt={image.name} /> : <div className="image-placeholder">Select an image asset</div>}
                      <figcaption>{block.title || image?.name || 'Image caption'}</figcaption>
                    </figure>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
