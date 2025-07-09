const https = require('https');
const http = require('http');

// Test a smaller subset of books first
const testBooks = [
  // Top 100 - test first 5
  { id: '1342', title: 'Pride and Prejudice by Jane Austen', collection: 'Top 100' },
  { id: '84', title: 'Frankenstein; Or, The Modern Prometheus by Mary Wollstonecraft Shelley', collection: 'Top 100' },
  { id: '11', title: 'Alice\'s Adventures in Wonderland by Lewis Carroll', collection: 'Top 100' },
  { id: '1661', title: 'The Adventures of Sherlock Holmes by Arthur Conan Doyle', collection: 'Top 100' },
  { id: '2701', title: 'Moby Dick; Or, The Whale by Herman Melville', collection: 'Top 100' },
  
  // Shakespeare - test first 5
  { id: '1543', title: 'A Lover\'s Complaint', collection: 'Shakespeare' },
  { id: '1514', title: 'A Midsummer Night\'s Dream', collection: 'Shakespeare' },
  { id: '1529', title: 'All\'s Well That Ends Well', collection: 'Shakespeare' },
  { id: '1534', title: 'Antony and Cleopatra', collection: 'Shakespeare' },
  { id: '1523', title: 'As You Like It', collection: 'Shakespeare' },
  
  // French - test first 5
  { id: '17489', title: 'Les misérables Tome I: Fantine', collection: 'French' },
  { id: '2650', title: 'Du côté de chez Swann', collection: 'French' },
  { id: '28718', title: 'Les crimes de l\'amour', collection: 'French' },
  { id: '13951', title: 'Les trois mousquetaires', collection: 'French' },
  { id: '17989', title: 'Le comte de Monte-Cristo, Tome I', collection: 'French' },
  
  // German - test first 5
  { id: '14075', title: 'Die Frauenfrage: ihre geschichtliche Entwicklung und wirtschaftliche Seite (German)', collection: 'German' },
  { id: '3221', title: 'Mr. Honey\'s Large Business Dictionary (English-German) (German)', collection: 'German' },
  { id: '58804', title: 'Die Deutschen Familiennamen, geschichtlich, geographisch, sprachlich (German)', collection: 'German' },
  { id: '3213', title: 'Mr. Honey\'s Beginner\'s Dictionary (English-German) (German)', collection: 'German' },
  { id: '43759', title: 'Geflügelte Worte: Der Citatenschatz des deutschen Volkes (German)', collection: 'German' },
  
  // Spanish - test first 5
  { id: '2000', title: 'Don Quijote (Spanish)', collection: 'Spanish' },
  { id: '67961', title: 'El arte de amar (Spanish)', collection: 'Spanish' },
  { id: '58221', title: 'La Odisea (Spanish)', collection: 'Spanish' },
  { id: '21144', title: 'Las Fábulas de Esopo, Vol. 03 (Spanish)', collection: 'Spanish' },
  { id: '39647', title: 'Heath\'s Modern Language Series: The Spanish American Reader (Spanish)', collection: 'Spanish' },
  
  // Italian - test first 5
  { id: '48776', title: 'Petrarch, the First Modern Scholar and Man of Letters', collection: 'Italian' },
  { id: '41537', title: 'The Divine Comedy of Dante Alighieri: The Inferno', collection: 'Italian' },
  { id: '57303', title: 'La Divina Comedia (Spanish)', collection: 'Italian' },
  { id: '50306', title: 'Rinaldo ardito: Frammenti inediti pubblicati sul manoscritto originale (Italian)', collection: 'Italian' },
  { id: '1012', title: 'La Divina Commedia di Dante (Italian)', collection: 'Italian' },
  
  // Poetry - test first 5
  { id: '3011', title: 'The Lady of the Lake', collection: 'Poetry' },
  { id: '24571', title: 'Der Struwwelpeter (German)', collection: 'Poetry' },
  { id: '6130', title: 'The Iliad', collection: 'Poetry' },
  { id: '16328', title: 'Beowulf: An Anglo-Saxon Epic Poem', collection: 'Poetry' },
  { id: '2147', title: 'The Works of Edgar Allan Poe — Volume 1', collection: 'Poetry' },
];

// Function to test a URL
function testUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, { timeout: 5000 }, (res) => {
      if (res.statusCode === 200) {
        resolve({ success: true, statusCode: res.statusCode });
      } else {
        resolve({ success: false, statusCode: res.statusCode });
      }
    });
    
    req.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
  });
}

// Function to test a book with both URL patterns
async function testBook(book) {
  const urls = [
    { url: `https://www.gutenberg.org/files/${book.id}/${book.id}-0.txt`, type: 'files' },
    { url: `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.txt`, type: 'cache' }
  ];
  
  for (const urlInfo of urls) {
    const result = await testUrl(urlInfo.url);
    if (result.success) {
      return { success: true, workingUrl: urlInfo.url, type: urlInfo.type };
    }
  }
  
  return { success: false, book };
}

// Main testing function
async function runTests() {
  const results = {
    working: [],
    failing: []
  };
  
  console.log('Testing book URLs...\n');
  
  for (const book of testBooks) {
    console.log(`Testing: ${book.title} (${book.collection})`);
    const result = await testBook(book);
    if (result.success) {
      results.working.push({
        ...book,
        workingUrl: result.workingUrl,
        type: result.type
      });
      console.log(`  ✅ Working (${result.type})`);
    } else {
      results.failing.push(book);
      console.log(`  ❌ Failed`);
    }
  }
  
  console.log('\n=== RESULTS ===');
  console.log(`Working: ${results.working.length}`);
  console.log(`Failing: ${results.failing.length}`);
  
  if (results.failing.length > 0) {
    console.log('\n=== FAILING BOOKS ===');
    for (const book of results.failing) {
      console.log(`${book.collection}: ${book.title} (ID: ${book.id})`);
    }
  }
  
  return results;
}

// Run the test
runTests().catch(console.error); 