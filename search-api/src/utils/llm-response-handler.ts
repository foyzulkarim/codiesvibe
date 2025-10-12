/**
 * Utility functions for handling LLM responses with thinking blocks
 */

/**
 * Extract clean content from LLM responses by removing thinking blocks
 * Handles both string responses with thinking blocks and array responses
 */
export function extractCleanContent(response: any): string {
  if (!response) return '';
  
  // Convert response to string if it's not already
  let content: string;
  
  if (typeof response === 'string') {
    console.log('extractCleanContent(): String response');
    content = response;
  } else if (response && typeof response.content === 'string') {
    console.log('extractCleanContent(): String content response');
    content = response.content;
  } else if (response && Array.isArray(response.content)) {
    // For array responses, concatenate all text blocks
    const textBlocks = response.content
      .filter((block: any) => block.type === 'text' && typeof block.text === 'string')
      .map((block: any) => block.text);
    content = textBlocks.join(' ');
  } else {
    // Handle other content types by converting to string
    content = JSON.stringify(response);
  }
  
  // Remove thinking blocks in XML format: <thinking>...</thinking> or <think>...</think>
  if (content.includes('<thinking>')) {
    const parts = content.split('<thinking>');
    if (parts.length > 1) {
      const afterThinking = parts[1];
      const endThinkingIndex = afterThinking.indexOf('</thinking>');
      if (endThinkingIndex !== -1) {
        content = afterThinking.substring(endThinkingIndex + '</thinking>'.length).trim();
      } else {
        // If no closing tag, take everything after the opening tag
        content = afterThinking.trim();
      }
    }
  } else if (content.includes('<think>')) {
    const parts = content.split('<think>');
    if (parts.length > 1) {
      const afterThinking = parts[1];
      const endThinkingIndex = afterThinking.indexOf('</think>');
      if (endThinkingIndex !== -1) {
        content = afterThinking.substring(endThinkingIndex + '</think>'.length).trim();
      } else {
        // If no closing tag, take everything after the opening tag
        content = afterThinking.trim();
      }
    }
  }
  
  // Remove thinking blocks in JSON format: "thinking": "..."
  if (content.includes('"thinking"')) {
    // This handles the case where thinking might be in a JSON structure
    const thinkingRegex = /"thinking"\s*:\s*"[^"]*"/g;
    content = content.replace(thinkingRegex, '').trim();
  }
  
  // Also handle case where thinking might be a JSON object
  if (content.includes('"thinking":')) {
    const thinkingObjectRegex = /"thinking"\s*:\s*\{[^}]*\}/g;
    content = content.replace(thinkingObjectRegex, '').trim();
  }
  
  // Clean up any extra whitespace
  content = content.replace(/^\s+|\s+$/g, '');
  
  return content;
}

/**
 * Extract JSON content from LLM responses after removing thinking blocks
 */
export function extractJsonFromResponse(response: any): string {
  const cleanContent = extractCleanContent(response);
  
  // Look for JSON in code blocks
  if (cleanContent.includes('```json')) {
    const jsonMatch = cleanContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }
  }
  
  // Look for JSON in regular code blocks
  if (cleanContent.includes('```')) {
    const codeMatch = cleanContent.match(/```\s*([\s\S]*?)\s*```/);
    if (codeMatch) {
      return codeMatch[1].trim();
    }
  }
  
  // Clean up excessive newlines and whitespace
  let processedContent = cleanContent
    .replace(/\n\s*\n/g, '\n')  // Remove multiple consecutive newlines
    .replace(/\s+/g, ' ')       // Replace multiple spaces with single space
    .trim();
  
  // Try to find JSON object boundaries first (more common case)
  const objStart = processedContent.indexOf('{');
  const objEnd = processedContent.lastIndexOf('}');
  
  if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
    let jsonCandidate = processedContent.substring(objStart, objEnd + 1);
    
    // Clean up the JSON candidate
    jsonCandidate = jsonCandidate
      .replace(/\s*\n\s*/g, ' ')  // Replace newlines with spaces
      .replace(/,\s*}/g, '}')     // Remove trailing commas before closing braces
      .replace(/,\s*]/g, ']')     // Remove trailing commas before closing brackets
      .trim();
    
    // Try to parse to validate it's proper JSON
    try {
      JSON.parse(jsonCandidate);
      return jsonCandidate;
    } catch (e) {
      // If parsing fails, try to fix common issues
      
      // Fix malformed structure like "[]," followed by object properties
      if (jsonCandidate.includes('[]')) {
        // Remove standalone arrays that are followed by commas
        jsonCandidate = jsonCandidate.replace(/\[\s*\]\s*,\s*/g, '');
        
        // If it starts with array notation, try to wrap it properly
        if (jsonCandidate.startsWith('[]')) {
          jsonCandidate = jsonCandidate.substring(2).trim();
          if (jsonCandidate.startsWith(',')) {
            jsonCandidate = jsonCandidate.substring(1).trim();
          }
        }
      }
      
      // Try parsing again after fixes
      try {
        JSON.parse(jsonCandidate);
        return jsonCandidate;
      } catch (e2) {
        // If still fails, fall through to array extraction
      }
    }
  }
  
  // Try to find JSON array boundaries
  const jsonStart = processedContent.indexOf('[');
  const jsonEnd = processedContent.lastIndexOf(']');
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    let jsonCandidate = processedContent.substring(jsonStart, jsonEnd + 1);
    
    // Clean up the JSON candidate
    jsonCandidate = jsonCandidate
      .replace(/\s*\n\s*/g, ' ')  // Replace newlines with spaces
      .replace(/,\s*]/g, ']')     // Remove trailing commas
      .trim();
    
    try {
      JSON.parse(jsonCandidate);
      return jsonCandidate;
    } catch (e) {
      // If parsing fails, return the processed content
    }
  }
  
  // If no clear JSON structure found, return the processed content
  return processedContent;
}
