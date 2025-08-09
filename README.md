# WordPress to Canva Bulk Create Tool

A React component that fetches WordPress posts, optimizes titles with AI for Pinterest engagement, validates images, and generates CSV files for Canva's bulk create tool.

## Features

### 🚀 Core Functionality
- **WordPress API Integration**: Fetch posts from any WordPress site using the REST API
- **AI Title Optimization**: Uses Claude API to optimize titles for Pinterest engagement
- **Image Validation**: Validates featured image URLs to ensure they're accessible
- **CSV Generation**: Creates properly formatted CSV files for Canva's bulk create tool
- **Flexible Configuration**: Customizable CSV columns and batch processing

### 📊 Data Processing
- **Batch Processing**: Process posts in configurable batches (1-100)
- **Pagination Support**: Use offset parameter to fetch different sets of posts
- **Duplicate Prevention**: Tracks processed post IDs to avoid duplicates
- **Error Handling**: Graceful handling of API failures and network issues

### 🎨 User Interface
- **Clean Design**: Professional, responsive interface
- **Progress Indicators**: Real-time status updates for all operations
- **Results Table**: Visual display of original vs optimized titles
- **Error Display**: Clear error messages for failed operations

## Installation

1. **Clone or download the files**
2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up your Claude API key**:
   Create a `.env` file in the root directory:
   ```
   REACT_APP_CLAUDE_API_KEY=your_claude_api_key_here
   ```

4. **Start the development server**:
   ```bash
   npm start
   ```

## Usage

### 1. WordPress Configuration
- Enter your WordPress domain (e.g., `yoursite.com`)
- Set batch size (1-100 posts per fetch)
- Set offset for pagination (0 for first batch)

### 2. Fetch Posts
- Click "Fetch Posts" to retrieve posts from your WordPress site
- The tool will extract: post ID, title, featured image URL, and permalink

### 3. Validate Images
- Click "Validate Images" to check if featured images are accessible
- Images are marked as: `valid`, `invalid`, or `no_image`

### 4. Optimize Titles
- Click "Optimize Titles" to use AI for Pinterest-optimized titles
- Only posts with valid images will be processed
- Titles are optimized in batches of 5 for efficiency

### 5. Configure CSV
- Customize column headers as needed
- Add or remove columns
- Preview data before download

### 6. Generate CSV
- Click "Generate & Download CSV" to create the file
- CSV is automatically downloaded with timestamp

## API Requirements

### Claude API
- **Endpoint**: `https://api.anthropic.com/v1/messages`
- **Model**: `claude-sonnet-4-20250514`
- **Authentication**: API key in `x-api-key` header
- **Rate Limits**: Processed in batches of 5 titles

### WordPress REST API
- **Endpoint**: `https://{domain}/wp-json/wp/v2/posts`
- **Parameters**: `per_page`, `_embed`, `offset`
- **Response**: JSON array with post data and embedded media

## CSV Format

The generated CSV includes these default columns:
- `Title`: Original post title
- `Optimized_Title`: AI-optimized title for Pinterest
- `Image_URL`: Featured image URL
- `Post_URL`: Post permalink
- `Image_Status`: Validation status (valid/invalid/no_image)

## Error Handling

The component handles various error scenarios:
- **Invalid domain**: Domain validation before API calls
- **WordPress API failures**: Network errors, invalid responses
- **Image validation failures**: Unreachable or invalid image URLs
- **AI API failures**: Rate limits, authentication errors
- **CSV generation issues**: Data formatting problems

## Security Considerations

- **Domain Validation**: Prevents malicious URL injection
- **API Key Protection**: Uses environment variables for sensitive data
- **Data Sanitization**: Cleans data before CSV generation
- **CORS Handling**: Proper error handling for cross-origin requests

## Customization

### Adding Custom Columns
```javascript
// Modify the csvColumns state
const [csvColumns, setCsvColumns] = useState([
  'Title', 'Optimized_Title', 'Image_URL', 'Post_URL', 'Image_Status', 'Custom_Column'
]);
```

### Modifying AI Prompts
```javascript
// Update the prompt in callClaudeAPI function
const prompt = `Your custom prompt here...`;
```

### Changing Batch Sizes
```javascript
// Modify batch processing size
const batchSize = 10; // Process 10 titles at once
```

## Troubleshooting

### Common Issues

1. **"Failed to fetch posts"**
   - Check if the WordPress site has REST API enabled
   - Verify the domain is correct
   - Ensure the site is publicly accessible

2. **"No posts with valid images"**
   - Run image validation first
   - Check if posts have featured images
   - Verify image URLs are accessible

3. **"AI optimization failed"**
   - Check your Claude API key
   - Verify API quota and rate limits
   - Ensure network connectivity

4. **"CSV download not working"**
   - Check browser download settings
   - Verify file permissions
   - Try different browser

### Debug Mode

Enable console logging for debugging:
```javascript
// Add to component for detailed logging
console.log('Posts:', posts);
console.log('Processing status:', processingStatus);
```

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Performance Tips

1. **Batch Size**: Use smaller batches (10-20) for better performance
2. **Image Validation**: Skip validation if not needed for faster processing
3. **API Limits**: Respect Claude API rate limits (5 titles per batch)
4. **Memory**: Clear data periodically for large datasets

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review browser console for errors
3. Verify API configurations
4. Test with a simple WordPress site first

---

**Note**: This tool requires a valid Claude API key to function properly. The AI optimization feature will not work without proper API credentials.
