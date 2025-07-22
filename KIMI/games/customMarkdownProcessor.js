const fs = require('fs');
const path = require('path');

const markdownContent = new Map();

/**
 * A simple custom parser to convert a line of Markdown to HTML.
 * @param {string} line - A single line of text from the Markdown file.
 * @returns {string} The corresponding HTML string.
 */
const parseMarkdownLine = (line) => {
  // Handle Headings (e.g., # Title, ## Subtitle)
  if (line.startsWith('# ')) {
    return `<h1>${line.substring(2)}</h1>`;
  }
  if (line.startsWith('## ')) {
    return `<h2>${line.substring(3)}</h2>`;
  }
  if (line.startsWith('### ')) {
    return `<h3>${line.substring(4)}</h3>`;
  }

  // Handle Unordered List Items (e.g., * Item)
  if (line.startsWith('* ')) {
    return `<li>${line.substring(2)}</li>`;
  }

  // Handle Bold Text within a line (e.g., **bold**)
  line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Handle empty lines (which can separate paragraphs)
  if (line.trim() === '') {
    return ''; // Will be filtered out later
  }

  // Otherwise, treat it as a paragraph
  return `<p>${line}</p>`;
};

/**
 * Parses a full Markdown text block into an HTML string.
 * @param {string} markdownText - The full content of a .md file.
 * @returns {string} The complete HTML document as a string.
 */
const convertMarkdownToHtml = (markdownText) => {
  const lines = markdownText.split('\n');
  let html = '';
  let inList = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Logic to wrap <li> elements in <ul> tags
    if (trimmedLine.startsWith('* ')) {
      if (!inList) {
        html += '<ul>\n';
        inList = true;
      }
      html += `  ${parseMarkdownLine(trimmedLine)}\n`;
    } else {
      if (inList) {
        html += '</ul>\n';
        inList = false;
      }
      const parsedLine = parseMarkdownLine(line);
      if (parsedLine) {
        html += `${parsedLine}\n`;
      }
    }
  }

  // Close any list that might be open at the end of the file
  if (inList) {
    html += '</ul>\n';
  }

  return html;
};

/**
 * Reads all .md files in its own directory, converts them to HTML
 * using the custom parser, and caches the result.
 */
const processMarkdownFiles = () => {
  try {
    // __dirname is the directory where this script resides
    const files = fs.readdirSync(__dirname);

    files.forEach(file => {
      if (path.extname(file).toLowerCase() === '.md') {
        const markdown = fs.readFileSync(path.join(__dirname, file), 'utf-8');
        const html = convertMarkdownToHtml(markdown);
        const name = path.basename(file, '.md');
        markdownContent.set(name, html);
      }
    });
  } catch (error) {
    console.error("Error processing markdown files:", error);
  }
};

/**
 * Retrieves the HTML content of a processed markdown file.
 * @param {string} name - The name of the markdown file (without the .md extension).
 * @returns {string|undefined} The HTML content or undefined if not found.
 */
const getMarkdownPreview = (name) => {
  return markdownContent.get(name);
};

// Immediately process the files when the module is loaded
processMarkdownFiles();

// Export the public functions
module.exports = {
  getMarkdownPreview,
  listAvailablePreviews: () => Array.from(markdownContent.keys())
};