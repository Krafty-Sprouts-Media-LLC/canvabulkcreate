import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

const WordPressToCanva = () => {
  // State management
  const [config, setConfig] = useState({
    domain: '',
    batchSize: 20,
    currentOffset: 0
  });
  
  const [posts, setPosts] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [csvColumns, setCsvColumns] = useState([
    'Title', 'Optimized_Title', 'Image_URL', 'Post_URL', 'Image_Status'
  ]);
  
  const [processingStatus, setProcessingStatus] = useState({
    fetching: false,
    validating: false,
    optimizing: false,
    generating: false
  });
  
  const [errors, setErrors] = useState([]);
  const [processedIds, setProcessedIds] = useState(new Set());

  // Helper function to validate domain
  const validateDomain = (domain) => {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain.replace(/^https?:\/\//, ''));
  };

  // Helper function to validate image URL
  const validateImageUrl = async (imageUrl) => {
    try {
      // Try HEAD request first (more efficient)
      const response = await fetch(imageUrl, { 
        method: 'HEAD',
        mode: 'no-cors' // This allows cross-origin requests
      });
      return true; // If we get here, the request didn't fail
    } catch (error) {
      try {
        // Fallback: try to create an image object to test if it loads
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = imageUrl;
          // Timeout after 5 seconds
          setTimeout(() => resolve(false), 5000);
        });
      } catch (fallbackError) {
        return false;
      }
    }
  };

  // Fetch WordPress posts
  const fetchWordPressPosts = async () => {
    if (!validateDomain(config.domain)) {
      setErrors(['Please enter a valid domain']);
      return;
    }

    setProcessingStatus(prev => ({ ...prev, fetching: true }));
    setErrors([]);

    try {
      const cleanDomain = config.domain.replace(/^https?:\/\//, '');
      const url = `https://${cleanDomain}/wp-json/wp/v2/posts?per_page=${config.batchSize}&_embed&offset=${config.currentOffset}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format from WordPress API');
      }

      // Extract post data
      const extractedPosts = data.map(post => ({
        id: post.id,
        title: post.title.rendered,
        permalink: post.link,
        imageUrl: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
        imageStatus: 'pending'
      }));

      // Filter out already processed posts
      const newPosts = extractedPosts.filter(post => !processedIds.has(post.id));
      
      if (newPosts.length === 0) {
        setErrors(['No new posts found. Try increasing the offset or check if all posts have been processed.']);
        setProcessingStatus(prev => ({ ...prev, fetching: false }));
        return;
      }

      setPosts(prev => [...prev, ...newPosts]);
      setProcessedIds(prev => new Set([...prev, ...newPosts.map(p => p.id)]));
      
    } catch (error) {
      setErrors([`Failed to fetch posts: ${error.message}`]);
    } finally {
      setProcessingStatus(prev => ({ ...prev, fetching: false }));
    }
  };

  // Validate all images
  const validateImages = async () => {
    setProcessingStatus(prev => ({ ...prev, validating: true }));
    setErrors([]);
    
    const updatedPosts = [...posts];
    let validCount = 0;
    let invalidCount = 0;
    let noImageCount = 0;
    
    for (let i = 0; i < updatedPosts.length; i++) {
      const post = updatedPosts[i];
      if (post.imageUrl) {
        const isValid = await validateImageUrl(post.imageUrl);
        updatedPosts[i] = { ...post, imageStatus: isValid ? 'valid' : 'invalid' };
        if (isValid) validCount++;
        else invalidCount++;
      } else {
        updatedPosts[i] = { ...post, imageStatus: 'no_image' };
        noImageCount++;
      }
    }
    
    setPosts(updatedPosts);
    setProcessingStatus(prev => ({ ...prev, validating: false }));
    
    // Show validation results
    const messages = [];
    if (validCount > 0) messages.push(`${validCount} images validated successfully`);
    if (invalidCount > 0) messages.push(`${invalidCount} images failed validation (CORS restrictions may apply)`);
    if (noImageCount > 0) messages.push(`${noImageCount} posts have no featured images`);
    
    if (messages.length > 0) {
      setErrors(messages);
    }
  };

  // Optimize titles with AI
  const optimizeTitles = async () => {
    setProcessingStatus(prev => ({ ...prev, optimizing: true }));
    
    const postsWithImages = posts.filter(post => post.imageStatus === 'valid');
    
    if (postsWithImages.length === 0) {
      setErrors(['No posts with valid images to optimize. Please validate images first.']);
      setProcessingStatus(prev => ({ ...prev, optimizing: false }));
      return;
    }

    // Process in batches of 5
    const batchSize = 5;
    const updatedPosts = [...posts];
    
    for (let i = 0; i < postsWithImages.length; i += batchSize) {
      const batch = postsWithImages.slice(i, i + batchSize);
      const titles = batch.map(post => post.title);
      
      try {
        const optimizedTitles = await callClaudeAPI(titles);
        
        // Update posts with optimized titles
        batch.forEach((post, index) => {
          const postIndex = updatedPosts.findIndex(p => p.id === post.id);
          if (postIndex !== -1 && optimizedTitles[index]) {
            updatedPosts[postIndex] = {
              ...updatedPosts[postIndex],
              optimizedTitle: optimizedTitles[index]
            };
          }
        });
        
        setPosts(updatedPosts);
        
      } catch (error) {
        console.error(`Failed to optimize batch ${i / batchSize + 1}:`, error);
        // Continue with next batch even if this one fails
      }
    }
    
    setProcessingStatus(prev => ({ ...prev, optimizing: false }));
  };

  // Call Claude API for title optimization
  const callClaudeAPI = async (titles) => {
    const prompt = `Rewrite these blog post titles for Pinterest to maximize engagement and clicks. Pinterest users respond to emotional hooks, benefit-driven language, curiosity gaps, and actionable promises. 

Transform each title to be more Pinterest-friendly while staying truthful to the content:

Original titles:
${titles.map((title, index) => `${index + 1}. ${title}`).join('\n')}

Respond with ONLY a JSON array in this exact format:
[
  "optimized title 1",
  "optimized title 2"
]

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.REACT_APP_CLAUDE_API_KEY || 'your-api-key-here',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content[0].text;
      
      // Extract JSON from response
      const jsonMatch = content.match(/\[.*\]/s);
      if (!jsonMatch) {
        throw new Error('Invalid response format from AI');
      }
      
      return JSON.parse(jsonMatch[0]);
      
    } catch (error) {
      console.error('Claude API error:', error);
      throw error;
    }
  };

  // Generate and download CSV
  const generateCSV = () => {
    setProcessingStatus(prev => ({ ...prev, generating: true }));
    
    try {
      const csvData = posts.map(post => {
        const row = {};
        csvColumns.forEach(column => {
          switch (column) {
            case 'Title':
              row[column] = post.title || '';
              break;
            case 'Optimized_Title':
              row[column] = post.optimizedTitle || post.title || '';
              break;
            case 'Image_URL':
              row[column] = post.imageUrl || '';
              break;
            case 'Post_URL':
              row[column] = post.permalink || '';
              break;
            case 'Image_Status':
              row[column] = post.imageStatus || '';
              break;
            default:
              row[column] = '';
          }
        });
        return row;
      });

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `canva_bulk_create_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      setErrors([`Failed to generate CSV: ${error.message}`]);
    } finally {
      setProcessingStatus(prev => ({ ...prev, generating: false }));
    }
  };

  // Add new column
  const addColumn = () => {
    const newColumn = `Column_${csvColumns.length + 1}`;
    setCsvColumns(prev => [...prev, newColumn]);
  };

  // Remove column
  const removeColumn = (index) => {
    setCsvColumns(prev => prev.filter((_, i) => i !== index));
  };

  // Update column header
  const updateColumnHeader = (index, newHeader) => {
    setCsvColumns(prev => prev.map((col, i) => i === index ? newHeader : col));
  };

  // Clear all data
  const clearData = () => {
    setPosts([]);
    setProcessedIds(new Set());
    setErrors([]);
    setConfig(prev => ({ ...prev, currentOffset: 0 }));
  };

  return (
    <div className="wordpress-to-canva" style={styles.container}>
      <h1 style={styles.title}>WordPress to Canva Bulk Create Tool</h1>
      
      {/* WordPress API Configuration */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>WordPress API Configuration</h2>
        <div style={styles.configGrid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Domain:</label>
            <input
              type="text"
              value={config.domain}
              onChange={(e) => setConfig(prev => ({ ...prev, domain: e.target.value }))}
              placeholder="yoursite.com"
              style={styles.input}
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Batch Size:</label>
            <input
              type="number"
              value={config.batchSize}
              onChange={(e) => setConfig(prev => ({ ...prev, batchSize: parseInt(e.target.value) || 20 }))}
              min="1"
              max="100"
              style={styles.input}
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Offset:</label>
            <input
              type="number"
              value={config.currentOffset}
              onChange={(e) => setConfig(prev => ({ ...prev, currentOffset: parseInt(e.target.value) || 0 }))}
              min="0"
              style={styles.input}
            />
          </div>
        </div>
        <button
          onClick={fetchWordPressPosts}
          disabled={processingStatus.fetching || !config.domain}
          style={styles.button}
        >
          {processingStatus.fetching ? 'Fetching...' : 'Fetch Posts'}
        </button>
      </section>

      {/* Processing Controls */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Data Processing</h2>
        <div style={styles.buttonGroup}>
          <button
            onClick={validateImages}
            disabled={posts.length === 0 || processingStatus.validating}
            style={styles.button}
          >
            {processingStatus.validating ? 'Validating...' : 'Validate Images'}
          </button>
          <button
            onClick={optimizeTitles}
            disabled={posts.filter(p => p.imageStatus === 'valid').length === 0 || processingStatus.optimizing}
            style={styles.button}
          >
            {processingStatus.optimizing ? 'Optimizing...' : 'Optimize Titles'}
          </button>
          <button
            onClick={() => {
              // Allow optimization even with invalid images
              const postsWithAnyImages = posts.filter(post => post.imageStatus !== 'no_image');
              if (postsWithAnyImages.length > 0) {
                setPosts(prev => prev.map(post => 
                  post.imageStatus === 'invalid' ? { ...post, imageStatus: 'valid' } : post
                ));
                setErrors(['Note: Proceeding with image validation bypassed. Some images may not be accessible due to CORS restrictions.']);
              }
            }}
            disabled={posts.filter(p => p.imageStatus === 'invalid').length === 0 || processingStatus.optimizing}
            style={styles.buttonSecondary}
          >
            Bypass Image Validation
          </button>
          <button
            onClick={clearData}
            style={styles.buttonSecondary}
          >
            Clear All Data
          </button>
        </div>
      </section>

      {/* CSV Configuration */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>CSV Configuration</h2>
        <div style={styles.csvConfig}>
          <div style={styles.columnHeaders}>
            {csvColumns.map((column, index) => (
              <div key={index} style={styles.columnHeader}>
                <input
                  type="text"
                  value={column}
                  onChange={(e) => updateColumnHeader(index, e.target.value)}
                  style={styles.columnInput}
                />
                <button
                  onClick={() => removeColumn(index)}
                  style={styles.removeButton}
                  disabled={csvColumns.length <= 1}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button onClick={addColumn} style={styles.buttonSecondary}>
            Add Column
          </button>
        </div>
        
        {posts.length > 0 && (
          <button
            onClick={generateCSV}
            disabled={processingStatus.generating}
            style={styles.button}
          >
            {processingStatus.generating ? 'Generating...' : 'Generate & Download CSV'}
          </button>
        )}
      </section>

      {/* Error Display */}
      {errors.length > 0 && (
        <section style={styles.section}>
          <h3 style={styles.errorTitle}>Errors:</h3>
          <div style={styles.errorList}>
            {errors.map((error, index) => (
              <div key={index} style={styles.error}>
                {error}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Results Display */}
      {posts.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Results ({posts.length} posts)</h2>
          <div style={styles.resultsContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Original Title</th>
                  <th style={styles.th}>Optimized Title</th>
                  <th style={styles.th}>Image Status</th>
                  <th style={styles.th}>Image URL</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post, index) => (
                  <tr key={post.id || index} style={styles.tr}>
                    <td style={styles.td}>{post.title}</td>
                    <td style={styles.td}>
                      {post.optimizedTitle ? (
                        <span style={styles.optimized}>{post.optimizedTitle}</span>
                      ) : (
                        <span style={styles.pending}>Not optimized</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.status,
                        ...(post.imageStatus === 'valid' ? styles.valid :
                            post.imageStatus === 'invalid' ? styles.invalid :
                            styles.noImage)
                      }}>
                        {post.imageStatus}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {post.imageUrl ? (
                        <a href={post.imageUrl} target="_blank" rel="noopener noreferrer" style={styles.link}>
                          View Image
                        </a>
                      ) : (
                        'No image'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

// Styles
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh'
  },
  title: {
    textAlign: 'center',
    color: '#333',
    marginBottom: '30px',
    fontSize: '2.5rem',
    fontWeight: 'bold'
  },
  section: {
    backgroundColor: 'white',
    padding: '20px',
    marginBottom: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    color: '#333',
    marginBottom: '20px',
    fontSize: '1.5rem',
    fontWeight: 'bold'
  },
  configGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    marginBottom: '5px',
    fontWeight: 'bold',
    color: '#555'
  },
  input: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px'
  },
  button: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    marginRight: '10px',
    marginBottom: '10px'
  },
  buttonSecondary: {
    backgroundColor: '#6c757d',
    color: 'white',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    marginRight: '10px',
    marginBottom: '10px'
  },
  buttonGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px'
  },
  csvConfig: {
    marginBottom: '20px'
  },
  columnHeaders: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '15px'
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  columnInput: {
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
    width: '120px'
  },
  removeButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  errorTitle: {
    color: '#dc3545',
    marginBottom: '10px'
  },
  errorList: {
    backgroundColor: '#f8d7da',
    border: '1px solid #f5c6cb',
    borderRadius: '4px',
    padding: '10px'
  },
  error: {
    color: '#721c24',
    marginBottom: '5px'
  },
  resultsContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  th: {
    backgroundColor: '#f8f9fa',
    padding: '12px',
    textAlign: 'left',
    borderBottom: '2px solid #dee2e6',
    fontWeight: 'bold'
  },
  tr: {
    borderBottom: '1px solid #dee2e6'
  },
  td: {
    padding: '12px',
    verticalAlign: 'top'
  },
  optimized: {
    color: '#28a745',
    fontWeight: 'bold'
  },
  pending: {
    color: '#6c757d',
    fontStyle: 'italic'
  },
  status: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  valid: {
    backgroundColor: '#d4edda',
    color: '#155724'
  },
  invalid: {
    backgroundColor: '#f8d7da',
    color: '#721c24'
  },
  noImage: {
    backgroundColor: '#fff3cd',
    color: '#856404'
  },
  link: {
    color: '#007bff',
    textDecoration: 'none'
  }
};

export default WordPressToCanva;
