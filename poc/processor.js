import fs from 'fs';
import path from 'path';

// File paths
const markdownFilePath = '/Users/foyzul/personal/codiesvibe/docs/Comprehensive-AI-Coding-Tools-Directory.md';
const outputFilePath = '/Users/foyzul/personal/codiesvibe/poc/extracted-tools.json';

function parseMarkdownFile() {
    try {
        // Read the markdown file
        const markdownContent = fs.readFileSync(markdownFilePath, 'utf8');
        
        // Array to store extracted tools
        const tools = [];
        
        // Split content into lines for sequential processing
        const lines = markdownContent.split('\n');
        let currentCategory = '';
        
        // Regular expressions
        const headerRegex = /^### (.+)$/; // Match ### headers
        const toolRegex = /^- \*\*([^*]+)\*\*(?:\s*\([^)]+\))?\s*-\s*(.+)$/; // Match tool entries
        
        for (const line of lines) {
            // Check if line is a header
            const headerMatch = line.match(headerRegex);
            if (headerMatch) {
                currentCategory = headerMatch[1].trim();
                continue;
            }
            
            // Check if line is a tool entry
            const toolMatch = line.match(toolRegex);
            if (toolMatch) {
                const name = toolMatch[1].trim();
                const description = toolMatch[2].trim();
                
                // Skip empty entries
                if (name && description) {
                    tools.push({
                        name: name,
                        description: description,
                        category: currentCategory
                    });
                }
            }
        }
        
        // Write the extracted tools to JSON file
        fs.writeFileSync(outputFilePath, JSON.stringify(tools, null, 2), 'utf8');
        
        console.log(`Successfully extracted ${tools.length} tools from the markdown file.`);
        console.log(`Output saved to: ${outputFilePath}`);
        
        // Display first few entries as preview
        console.log('\nFirst 5 extracted tools:');
        tools.slice(0, 5).forEach((tool, index) => {
            console.log(`${index + 1}. ${tool.name} [${tool.category}]: ${tool.description}`);
        });
        
    } catch (error) {
        console.error('Error processing the markdown file:', error.message);
        process.exit(1);
    }
}

// Run the parser
parseMarkdownFile();