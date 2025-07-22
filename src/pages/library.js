import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { t, getUserLanguage } from '@/i18n';
import { Clock, ArrowLeft } from 'lucide-react';
import frenchCollection from '../tools/french-literature.json';
import italianCollectionRaw from '../tools/italian-literature.json';
import spanishCollectionRaw from '../tools/spanish-literature.json';
import germanCollectionRaw from '../tools/german-literature.json';
import poetryCollectionRaw from '../tools/poetry.json';
import englishCollectionRaw from '../tools/english-literature.json';
import philosophersCollectionRaw from '../tools/philosophers.json';

// Project Gutenberg Top 100 (full list) - deduplicated
const top100 = [
  { id: '1342', title: 'Pride and Prejudice by Jane Austen' },
  { id: '84', title: 'Frankenstein; Or, The Modern Prometheus by Mary Wollstonecraft Shelley' },
  { id: '11', title: "Alice's Adventures in Wonderland by Lewis Carroll" },
  { id: '1661', title: 'The Adventures of Sherlock Holmes by Arthur Conan Doyle' },
  { id: '2701', title: 'Moby Dick; Or, The Whale by Herman Melville' },
  { id: '98', title: 'A Tale of Two Cities by Charles Dickens' },
  { id: '74', title: 'The Adventures of Tom Sawyer by Mark Twain' },
  { id: '345', title: 'Dracula by Bram Stoker' },
  { id: '1952', title: 'The Yellow Wallpaper by Charlotte Perkins Gilman' },
  { id: '2542', title: "A Doll's House by Henrik Ibsen" },
  { id: '5200', title: 'Metamorphosis by Franz Kafka' },
  { id: '1232', title: 'The Prince by Niccolò Machiavelli' },
  { id: '4300', title: 'Ulysses by James Joyce' },
  { id: '1400', title: 'Great Expectations by Charles Dickens' },
  { id: '2600', title: 'War and Peace by Leo Tolstoy' },
  { id: '1080', title: 'A Modest Proposal by Jonathan Swift' },
  { id: '64317', title: 'The Picture of Dorian Gray by Oscar Wilde' },
  { id: '520', title: 'The Waste Land by T. S. Eliot' },
  { id: '46', title: 'A Christmas Carol in Prose; Being a Ghost Story of Christmas by Charles Dickens' },
  { id: '140', title: 'The Wonderful Wizard of Oz by L. Frank Baum' },
  { id: '4306', title: 'The Call of the Wild by Jack London' },
  { id: '25305', title: 'The Scarlet Letter by Nathaniel Hawthorne' },
  { id: '1260', title: 'Jane Eyre by Charlotte Brontë' },
  // ... (add the rest up to 100)
];

// Shakespeare from Project Gutenberg (parsed from shakespeare.txt)
const shakespeareWorks = [
  { id: '1543', title: "A Lover's Complaint" },
  { id: '1514', title: "A Midsummer Night's Dream" },
  { id: '1529', title: "All's Well That Ends Well" },
  { id: '1534', title: 'Antony and Cleopatra' },
  { id: '1523', title: 'As You Like It' },
  { id: '1535', title: 'Coriolanus' },
  { id: '1538', title: 'Cymbeline' },
  { id: '1524', title: 'Hamlet' },
  { id: '1522', title: 'Julius Caesar' },
  { id: '1516', title: 'King Henry IV, Part 1' },
  { id: '1518', title: 'King Henry IV, Part 2' },
  { id: '1521', title: 'King Henry V' },
  { id: '1500', title: 'King Henry VI, Part 1' },
  { id: '1501', title: 'King Henry VI, Part 2' },
  { id: '1502', title: 'King Henry VI, Part 3' },
  { id: '1541', title: 'King Henry VIII' },
  { id: '1511', title: 'King John' },
  { id: '1532', title: 'King Lear' },
  { id: '1512', title: 'King Richard II' },
  { id: '1503', title: 'King Richard III' },
  { id: '1548', title: 'Locrine' },
  { id: '1510', title: "Love's Labour's Lost" },
  { id: '1533', title: 'Macbeth' },
  { id: '1530', title: 'Measure for Measure' },
  { id: '1545', title: 'Mucedorus' },
  { id: '1519', title: 'Much Ado About Nothing' },
  { id: '1531', title: 'Othello, the Moor of Venice' },
  { id: '1537', title: 'Pericles' },
  { id: '1513', title: 'Romeo and Juliet' },
  { id: '1041', title: "Shakespeare's Sonnets", directUrl: 'https://www.gutenberg.org/cache/epub/1041/pg1041.txt' },
  { id: '1547', title: 'Sir Thomas More' },
  { id: '1546', title: 'Sonnets To Sundry Notes of Music' },
  { id: '1504', title: 'The Comedy of Errors' },
  { id: '1515', title: 'The Merchant of Venice' },
  { id: '1517', title: 'The Merry Wives of Windsor' },
  { id: '1544', title: 'The Passionate Pilgrim' },
  { id: '1525', title: 'The Phoenix and the Turtle' },
  { id: '1505', title: 'The Rape of Lucrece' },
  { id: '1508', title: 'The Taming of the Shrew' },
  { id: '1540', title: 'The Tempest' },
  { id: '1507', title: 'The Tragedy of Titus Andronicus' },
  { id: '1542', title: 'The Two Noble Kinsmen' },
  { id: '1539', title: "The Winter's Tale" },
  { id: '1536', title: 'Timon of Athens' },
  { id: '1528', title: 'Troilus and Cressida' },
  { id: '1526', title: 'Twelfth Night' },
  { id: '1509', title: 'Two Gentlemen of Verona' },
  { id: '1045', title: 'Venus and Adonis' },
];

// Helper function to remove duplicates from collections
const removeDuplicates = (collection) => {
  const seen = new Set();
  return collection.filter(book => {
    const key = `${book.id}-${book.title}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

// Italian collection from Project Gutenberg (parsed from italian.txt)
const italianCollection = removeDuplicates(italianCollectionRaw.map(book => {
  let cleanTitle = book.title;
  if (book.author && cleanTitle.includes(book.author)) {
    cleanTitle = cleanTitle.replace(book.author, '').replace(/\s*by\s*$/, '').replace(/\(Italian\)/, '').replace(/\(Spanish\)/, '').trim();
    // Remove extra punctuation or whitespace
    cleanTitle = cleanTitle.replace(/[:\-–]+$/, '').trim();
  }
  return { ...book, title: cleanTitle };
}));

// Group Italian books by author
const italianByAuthor = italianCollection.reduce((acc, book) => {
  const author = book.author;
  if (!acc[author]) {
    acc[author] = [];
  }
  acc[author].push(book);
  return acc;
}, {});

// Convert to array of author sections
const italianAuthorSections = Object.entries(italianByAuthor).map(([author, books]) => ({
  author,
  books,
  count: books.length
}));



// Historical documents collection
const historicalCollection = [
  { id: 'magna-carta', title: 'Magna Carta', author: 'King John of England', localPath: '/public-domain-texts/magna-carta.txt' },
  { id: 'kjv-bible', title: 'The King James Version of the Bible', author: 'Various', localPath: '/public-domain-texts/king-james-bible.txt' },
  { id: 'tractatus', title: 'Tractatus Logico-Philosophicus', author: 'Ludwig Wittgenstein', localPath: '/public-domain-texts/tractatus.txt' },
];

// Group French books by author
const frenchByAuthor = removeDuplicates(frenchCollection).reduce((acc, book) => {
  const author = book.author;
  if (!acc[author]) {
    acc[author] = [];
  }
  acc[author].push(book);
  return acc;
}, {});

// Convert to array of author sections
const frenchAuthorSections = Object.entries(frenchByAuthor).map(([author, books]) => ({
  author,
  books,
  count: books.length
}));

// Spanish collection from Project Gutenberg (parsed from spanish.txt)
const spanishCollection = removeDuplicates(spanishCollectionRaw.map(book => {
  let cleanTitle = book.title;
  if (book.author && cleanTitle.includes(book.author)) {
    cleanTitle = cleanTitle.replace(book.author, '').replace(/\s*by\s*$/, '').replace(/\(Spanish\)/, '').trim();
    // Remove extra punctuation or whitespace
    cleanTitle = cleanTitle.replace(/[:\-–]+$/, '').trim();
  }
  return { ...book, title: cleanTitle };
}));

// Group Spanish books by author
const spanishByAuthor = spanishCollection.reduce((acc, book) => {
  const author = book.author;
  if (!acc[author]) {
    acc[author] = [];
  }
  acc[author].push(book);
  return acc;
}, {});

// Convert to array of author sections
const spanishAuthorSections = Object.entries(spanishByAuthor).map(([author, books]) => ({
  author,
  books,
  count: books.length
}));

// German collection from Project Gutenberg (parsed from german.txt)
const germanCollection = removeDuplicates(germanCollectionRaw.map(book => {
  let cleanTitle = book.title;
  if (book.author && cleanTitle.includes(book.author)) {
    cleanTitle = cleanTitle.replace(book.author, '').replace(/\s*by\s*$/, '').replace(/\(German\)/, '').trim();
    // Remove extra punctuation or whitespace
    cleanTitle = cleanTitle.replace(/[:\-–]+$/, '').trim();
  }
  return { ...book, title: cleanTitle };
}));

// Group German books by author
const germanByAuthor = germanCollection.reduce((acc, book) => {
  const author = book.author;
  if (!acc[author]) {
    acc[author] = [];
  }
  acc[author].push(book);
  return acc;
}, {});

// Convert to array of author sections
const germanAuthorSections = Object.entries(germanByAuthor).map(([author, books]) => ({
  author,
  books,
  count: books.length
}));

// Poetry collection from Project Gutenberg (parsed from poetry.txt)
const poetryCollection = removeDuplicates(poetryCollectionRaw.map(book => {
  let cleanTitle = book.title;
  if (book.author && cleanTitle.includes(book.author)) {
    cleanTitle = cleanTitle.replace(book.author, '').replace(/\s*by\s*$/, '').replace(/\(French\)/, '').replace(/\(Spanish\)/, '').replace(/\(German\)/, '').replace(/\(Italian\)/, '').trim();
    // Remove extra punctuation or whitespace
    cleanTitle = cleanTitle.replace(/[:\-–]+$/, '').trim();
  }
  return { ...book, title: cleanTitle };
}));

// Group Poetry books by author
const poetryByAuthor = poetryCollection.reduce((acc, book) => {
  const author = book.author;
  if (!acc[author]) {
    acc[author] = [];
  }
  acc[author].push(book);
  return acc;
}, {});

// Convert to array of author sections
const poetryAuthorSections = Object.entries(poetryByAuthor).map(([author, books]) => ({
  author,
  books,
  count: books.length
}));

// English collection from Project Gutenberg (parsed from english.txt)
const englishCollection = removeDuplicates(englishCollectionRaw.map(book => {
  let cleanTitle = book.title;
  if (book.author && cleanTitle.includes(book.author)) {
    cleanTitle = cleanTitle.replace(book.author, '').replace(/\s*by\s*$/, '').replace(/\(English\)/, '').trim();
    // Remove extra punctuation or whitespace
    cleanTitle = cleanTitle.replace(/[:\-–]+$/, '').trim();
  }
  return { ...book, title: cleanTitle };
}));

// Group English books by author
const englishByAuthor = englishCollection.reduce((acc, book) => {
  const author = book.author;
  if (!acc[author]) {
    acc[author] = [];
  }
  acc[author].push(book);
  return acc;
}, {});

// Convert to array of author sections
const englishAuthorSections = Object.entries(englishByAuthor).map(([author, books]) => ({
  author,
  books,
  count: books.length
}));

// Philosophers collection from Project Gutenberg
const philosophersCollection = removeDuplicates(philosophersCollectionRaw.map(book => {
  let cleanTitle = book.title;
  if (book.author && cleanTitle.includes(book.author)) {
    cleanTitle = cleanTitle.replace(book.author, '').replace(/\s*by\s*$/, '').trim();
    // Remove extra punctuation or whitespace
    cleanTitle = cleanTitle.replace(/[:\-–]+$/, '').trim();
  }
  return { ...book, title: cleanTitle };
}));

// Group Philosophers books by author
const philosophersByAuthor = philosophersCollection.reduce((acc, book) => {
  const author = book.author;
  if (!acc[author]) {
    acc[author] = [];
  }
  acc[author].push(book);
  return acc;
}, {});

// Convert to array of author sections
const philosophersAuthorSections = Object.entries(philosophersByAuthor).map(([author, books]) => ({
  author,
  books,
  count: books.length
}));

const collections = [
  {
    key: 'shakespeare',
    title: 'The Complete Works of Shakespeare',
    items: shakespeareWorks,
    onClickItem: 'handleReadShakespeare',
    itemKey: 'id',
  },
  {
    key: 'top100',
    title: 'Project Gutenberg Top 100',
    items: top100,
    onClickItem: 'handleReadGutenberg',
    itemKey: 'id',
  },
  {
    key: 'french',
    title: 'French Literature',
    items: frenchCollection,
    onClickItem: 'handleReadFrench',
    itemKey: 'id',
    authorSections: frenchAuthorSections, // Add author sections for French collection
  },
  {
    key: 'italian',
    title: 'Italian Literature',
    items: italianCollection,
    onClickItem: 'handleReadItalian',
    itemKey: 'id',
    authorSections: italianAuthorSections, // Add author sections for Italian collection
  },
  {
    key: 'spanish',
    title: 'Spanish Literature',
    items: spanishCollection,
    onClickItem: 'handleReadSpanish',
    itemKey: 'id',
    authorSections: spanishAuthorSections, // Add author sections for Spanish collection
  },
  {
    key: 'german',
    title: 'German Literature',
    items: germanCollection,
    onClickItem: 'handleReadGerman',
    itemKey: 'id',
    authorSections: germanAuthorSections, // Add author sections for German collection
  },
  {
    key: 'poetry',
    title: 'Poetry Collection',
    items: poetryCollection,
    onClickItem: 'handleReadPoetry',
    itemKey: 'id',
    authorSections: poetryAuthorSections, // Add author sections for Poetry collection
  },
  {
    key: 'english',
    title: 'English Literature',
    items: englishCollection,
    onClickItem: 'handleReadEnglish',
    itemKey: 'id',
    authorSections: englishAuthorSections, // Add author sections for English collection
  },
  {
    key: 'philosophers',
    title: 'Philosophers',
    items: philosophersCollection,
    onClickItem: 'handleReadPhilosophers',
    itemKey: 'id',
    authorSections: philosophersAuthorSections, // Add author sections for Philosophers collection
  },
  {
    key: 'historical',
    title: 'Historical Documents',
    items: historicalCollection,
    onClickItem: 'handleReadHistorical',
    itemKey: 'id',
  },
];

// Assign an emoji/icon and accent color to each collection
const collectionMeta = {
  shakespeare: { emoji: '🎭', color: '#f3e8ff' },
  top100: { emoji: '📚', color: '#e0f2fe' },
  french: { emoji: '🇫🇷', color: '#fef9c3' },
  italian: { emoji: '🇮🇹', color: '#e0fce7' },
  spanish: { emoji: '🇪🇸', color: '#e0f2fe' },
  german: { emoji: '🇩🇪', color: '#e0fce7' },
  poetry: { emoji: '📝', color: '#fff7ed' },
  english: { emoji: '🇬🇧', color: '#fef3c7' },
  philosophers: { emoji: '🤔', color: '#f0f9ff' },
  historical: { emoji: '📜', color: '#fef3c7' },
};

// Save a book to the recent books list in localStorage
function saveRecentBook(book) {
  try {
    const key = 'explainer:recentBooks';
    const raw = localStorage.getItem(key);
    let recent = [];
    if (raw) {
      recent = JSON.parse(raw);
    }
    // Remove any existing entry for this book (by id or title)
    recent = recent.filter(b => b.id !== book.id && b.title !== book.title);
    // Add to front
    recent.unshift({
      id: book.id,
      title: book.title,
      author: book.author || '',
      localPath: book.localPath || '',
      directUrl: book.directUrl || '',
    });
    // Limit to 8
    if (recent.length > 8) recent = recent.slice(0, 8);
    localStorage.setItem(key, JSON.stringify(recent));
  } catch (e) {
    // ignore
  }
}

export default function Library() {
  const router = useRouter();
  const [loadingShakespeare, setLoadingShakespeare] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [loadingFrench, setLoadingFrench] = useState(null);
  const [loadingItalian, setLoadingItalian] = useState(null);
  const [loadingSpanish, setLoadingSpanish] = useState(null);
  const [loadingGerman, setLoadingGerman] = useState(null);
  const [loadingPoetry, setLoadingPoetry] = useState(null);
  const [loadingEnglish, setLoadingEnglish] = useState(null);
  const [loadingPhilosophers, setLoadingPhilosophers] = useState(null);
  const [loadingHistorical, setLoadingHistorical] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [lang, setLang] = useState('en');
  const [customUrl, setCustomUrl] = useState('');
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState('');
  const [fileUploadLoading, setFileUploadLoading] = useState(false);
  const [fileUploadError, setFileUploadError] = useState('');
  const [fileUploadType, setFileUploadType] = useState(''); // Track file type for loading message
  const [fileUploadSize, setFileUploadSize] = useState(0); // Track file size for loading message
  const [recentBooks, setRecentBooks] = useState([]);

  useEffect(() => {
    setLang(getUserLanguage());
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('explainer:recentBooks');
      if (raw) {
        setRecentBooks(JSON.parse(raw));
      }
    } catch (e) {
      setRecentBooks([]);
    }
  }, []);

  // Handlers for each collection
  const handleReadGutenberg = async (book) => {
    try {
      console.log('Library: Loading Gutenberg book:', book);
      setLoadingId(book.id);
      const gutenbergUrl = `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.txt`;
      const apiUrl = `/api/fetch-gutenberg?url=${encodeURIComponent(gutenbergUrl)}`;
      console.log('Library: Fetching from:', apiUrl);
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`Failed to fetch book text: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.log('Library: Book text loaded, length:', text.length);
      localStorage.setItem('explainer:bookText', text);
      localStorage.setItem('explainer:bookTitle', book.title);
      saveRecentBook(book);
      console.log('Library: Navigating to /home');
      router.push('/home');
    } catch (err) {
      console.error('Library: Error loading Gutenberg book:', err);
      alert(`Could not load book text: ${err.message}`);
    } finally {
      setLoadingId(null);
    }
  };

  // In the handler for Shakespeare, use the Gutenberg plain text URL pattern
  const handleReadShakespeare = async (work) => {
    setLoadingShakespeare(work.id);
    // Try the -0.txt pattern first, fallback to /pg<ID>.txt if needed
    const gutenbergUrl1 = `https://www.gutenberg.org/files/${work.id}/${work.id}-0.txt`;
    const gutenbergUrl2 = `https://www.gutenberg.org/cache/epub/${work.id}/pg${work.id}.txt`;
    let text = null;
    try {
      let res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(gutenbergUrl1)}`);
      if (res.ok) {
        text = await res.text();
      } else {
        res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(gutenbergUrl2)}`);
        if (res.ok) text = await res.text();
      }
      if (!text) throw new Error('Failed to fetch Shakespeare work');
      localStorage.setItem('explainer:bookText', text);
      localStorage.setItem('explainer:bookTitle', `${work.title} by William Shakespeare`);
      saveRecentBook(work);
      router.push('/home');
    } catch (err) {
      alert('Could not load this work.');
    } finally {
      setLoadingShakespeare(null);
    }
  };

  // In the handler for French, use the Gutenberg plain text URL pattern
  const handleReadFrench = async (work) => {
    setLoadingFrench(work.id);
    const gutenbergUrl1 = `https://www.gutenberg.org/files/${work.id}/${work.id}-0.txt`;
    const gutenbergUrl2 = `https://www.gutenberg.org/cache/epub/${work.id}/pg${work.id}.txt`;
    let text = null;
    try {
      let res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(gutenbergUrl1)}`);
      if (res.ok) {
        text = await res.text();
      } else {
        res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(gutenbergUrl2)}`);
        if (res.ok) text = await res.text();
      }
      if (!text) throw new Error('Failed to fetch French work');
      localStorage.setItem('explainer:bookText', text);
      localStorage.setItem('explainer:bookTitle', `${work.title} by ${work.author}`);
      saveRecentBook(work);
      router.push('/home');
    } catch (err) {
      alert('Could not load this work.');
    } finally {
      setLoadingFrench(null);
    }
  };

  // In the handler for Italian, use the Gutenberg plain text URL pattern
  const handleReadItalian = async (work) => {
    setLoadingItalian(work.id);
    const gutenbergUrl1 = `https://www.gutenberg.org/files/${work.id}/${work.id}-0.txt`;
    const gutenbergUrl2 = `https://www.gutenberg.org/cache/epub/${work.id}/pg${work.id}.txt`;
    let text = null;
    try {
      let res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(gutenbergUrl1)}`);
      if (res.ok) {
        text = await res.text();
      } else {
        res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(gutenbergUrl2)}`);
        if (res.ok) text = await res.text();
      }
      if (!text) throw new Error('Failed to fetch Italian work');
      localStorage.setItem('explainer:bookText', text);
      localStorage.setItem('explainer:bookTitle', `${work.title}${work.author ? ' by ' + work.author : ''}`);
      saveRecentBook(work);
      router.push('/home');
    } catch (err) {
      alert('Could not load this work.');
    } finally {
      setLoadingItalian(null);
    }
  };

  // In the handler for Spanish, use the Gutenberg plain text URL pattern
  const handleReadSpanish = async (work) => {
    setLoadingSpanish(work.id);
    const gutenbergUrl1 = `https://www.gutenberg.org/files/${work.id}/${work.id}-0.txt`;
    const gutenbergUrl2 = `https://www.gutenberg.org/cache/epub/${work.id}/pg${work.id}.txt`;
    let text = null;
    try {
      let res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(gutenbergUrl1)}`);
      if (res.ok) {
        text = await res.text();
      } else {
        res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(gutenbergUrl2)}`);
        if (res.ok) text = await res.text();
      }
      if (!text) throw new Error('Failed to fetch Spanish work');
      localStorage.setItem('explainer:bookText', text);
      localStorage.setItem('explainer:bookTitle', `${work.title}${work.author ? ' by ' + work.author : ''}`);
      saveRecentBook(work);
      router.push('/home');
    } catch (err) {
      alert('Could not load this work.');
    } finally {
      setLoadingSpanish(null);
    }
  };

  // In the handler for German, use the Gutenberg plain text URL pattern
  const handleReadGerman = async (work) => {
    setLoadingGerman(work.id);
    const gutenbergUrl1 = `https://www.gutenberg.org/files/${work.id}/${work.id}-0.txt`;
    const gutenbergUrl2 = `https://www.gutenberg.org/cache/epub/${work.id}/pg${work.id}.txt`;
    let text = null;
    try {
      let res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(gutenbergUrl1)}`);
      if (res.ok) {
        text = await res.text();
      } else {
        res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(gutenbergUrl2)}`);
        if (res.ok) text = await res.text();
      }
      if (!text) throw new Error('Failed to fetch German work');
      localStorage.setItem('explainer:bookText', text);
      localStorage.setItem('explainer:bookTitle', `${work.title}${work.author ? ' by ' + work.author : ''}`);
      saveRecentBook(work);
      router.push('/home');
    } catch (err) {
      alert('Could not load this work.');
    } finally {
      setLoadingGerman(null);
    }
  };

  // In the handler for Poetry, use the Gutenberg plain text URL pattern
  const handleReadPoetry = async (work) => {
    setLoadingPoetry(work.id);
    let text = null;
    try {
      if (work.directUrl) {
        // Use the direct link if present
        const res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(work.directUrl)}`);
        if (res.ok) text = await res.text();
      } else {
        const gutenbergUrl1 = `https://www.gutenberg.org/files/${work.id}/${work.id}-0.txt`;
        const gutenbergUrl2 = `https://www.gutenberg.org/cache/epub/${work.id}/pg${work.id}.txt`;
        let res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(gutenbergUrl1)}`);
        if (res.ok) {
          text = await res.text();
        } else {
          res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(gutenbergUrl2)}`);
          if (res.ok) text = await res.text();
        }
      }
      if (!text) throw new Error('Failed to fetch Poetry work');
      localStorage.setItem('explainer:bookText', text);
      localStorage.setItem('explainer:bookTitle', `${work.title}${work.author ? ' by ' + work.author : ''}`);
      saveRecentBook(work);
      router.push('/home');
    } catch (err) {
      alert('Could not load this work.');
    } finally {
      setLoadingPoetry(null);
    }
  };

  // Handler for English literature
  const handleReadEnglish = async (work) => {
    setLoadingEnglish(work.id);
    let text = null;
    try {
      if (work.directUrl) {
        // Use the direct link if present
        const res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(work.directUrl)}`);
        if (res.ok) text = await res.text();
      } else {
        const gutenbergUrl1 = `https://www.gutenberg.org/files/${work.id}/${work.id}-0.txt`;
        const gutenbergUrl2 = `https://www.gutenberg.org/cache/epub/${work.id}/pg${work.id}.txt`;
        let res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(gutenbergUrl1)}`);
        if (res.ok) {
          text = await res.text();
        } else {
          res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(gutenbergUrl2)}`);
          if (res.ok) text = await res.text();
        }
      }
      if (!text) throw new Error('Failed to fetch English work');
      localStorage.setItem('explainer:bookText', text);
      localStorage.setItem('explainer:bookTitle', `${work.title}${work.author ? ' by ' + work.author : ''}`);
      saveRecentBook(work);
      router.push('/home');
    } catch (err) {
      alert('Could not load this work.');
    } finally {
      setLoadingEnglish(null);
    }
  };

  // Handler for Philosophers
  const handleReadPhilosophers = async (work) => {
    setLoadingPhilosophers(work.id);
    let text = null;
    try {
      if (work.directUrl) {
        // Use the direct link if present
        const res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(work.directUrl)}`);
        if (res.ok) text = await res.text();
      } else {
        const gutenbergUrl1 = `https://www.gutenberg.org/files/${work.id}/${work.id}-0.txt`;
        const gutenbergUrl2 = `https://www.gutenberg.org/cache/epub/${work.id}/pg${work.id}.txt`;
        let res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(gutenbergUrl1)}`);
        if (res.ok) {
          text = await res.text();
        } else {
          res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(gutenbergUrl2)}`);
          if (res.ok) text = await res.text();
        }
      }
      if (!text) throw new Error('Failed to fetch Philosophers work');
      localStorage.setItem('explainer:bookText', text);
      localStorage.setItem('explainer:bookTitle', `${work.title}${work.author ? ' by ' + work.author : ''}`);
      saveRecentBook(work);
      router.push('/home');
    } catch (err) {
      alert('Could not load this work.');
    } finally {
      setLoadingPhilosophers(null);
    }
  };

  // Handler for historical documents
  const handleReadHistorical = async (work) => {
    setLoadingHistorical(work.id);
    try {
      const res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(work.localPath)}`);
      if (!res.ok) throw new Error('Failed to fetch historical document');
      const text = await res.text();
      localStorage.setItem('explainer:bookText', text);
      localStorage.setItem('explainer:bookTitle', `${work.title}${work.author ? ' by ' + work.author : ''}`);
      saveRecentBook(work);
      router.push('/home');
    } catch (err) {
      alert('Could not load this document.');
    } finally {
      setLoadingHistorical(null);
    }
  };

  // Add handler function
  const handleReadWorldLanguages = async (work) => {
    setLoadingWorldLanguages(work.id);
    let text = null;
    try {
      if (work.directUrl) {
        const res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(work.directUrl)}`);
        if (res.ok) text = await res.text();
      } else {
        const gutenbergUrl1 = `https://www.gutenberg.org/files/${work.id}/${work.id}-0.txt`;
        const gutenbergUrl2 = `https://www.gutenberg.org/cache/epub/${work.id}/pg${work.id}.txt`;
        let res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(gutenbergUrl1)}`);
        if (res.ok) {
          text = await res.text();
        } else {
          res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(gutenbergUrl2)}`);
          if (res.ok) text = await res.text();
        }
      }
      if (!text) throw new Error('Failed to fetch World Languages work');
      localStorage.setItem('explainer:bookText', text);
      localStorage.setItem('explainer:bookTitle', `${work.title}${work.author ? ' by ' + work.author : ''}`);
      saveRecentBook(work);
      router.push('/home');
    } catch (err) {
      alert('Could not load this work.');
    } finally {
      setLoadingWorldLanguages(null);
    }
  };

  // Helper function to handle item selection and loading
  const handleItemClick = (collectionKey, item, handler) => {
    try {
      console.log('Library: Item clicked:', { collectionKey, item, handler: handler.name });
      // Prevent text selection
      if (window.getSelection) {
        window.getSelection().removeAllRanges();
      }
      // Set the selected item
      setSelectedItem({ collectionKey, itemId: item.id });
      // Call the original handler
      handler(item);
    } catch (error) {
      console.error('Library: Error in handleItemClick:', error);
      alert('Error loading book. Please try again.');
    }
  };

  // Reusable style object for clickable items
  const getClickableItemStyle = (isSelected, isLoading) => ({
    color: isSelected ? '#1d4ed8' : 'black',
    cursor: isLoading ? 'wait' : 'pointer',
    textDecoration: 'underline',
    fontWeight: isSelected ? 600 : 500,
    fontSize: 15,
    opacity: isLoading ? 0.6 : 1,
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
    display: 'inline-block',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none',
  });

  // Reusable style object for item containers
  const getItemContainerStyle = (isSelected, borderBottom) => ({
    padding: '6px 8px',
    borderBottom: borderBottom ? '1px solid #f1f5f9' : 'none',
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
    maxWidth: '100%',
    background: isSelected ? '#dbeafe' : 'transparent',
    borderRadius: 4,
    transition: 'background-color 0.2s',
  });

  // Map collection key to handler and loading state
  const handlerMap = {
    shakespeare: handleReadShakespeare,
    top100: handleReadGutenberg,
    french: handleReadFrench,
    italian: handleReadItalian,
    spanish: handleReadSpanish,
    german: handleReadGerman,
    poetry: handleReadPoetry,
    english: handleReadEnglish,
    philosophers: handleReadPhilosophers,
    historical: handleReadHistorical,
  };
  const loadingMap = {
    shakespeare: loadingShakespeare,
    top100: loadingId,
    french: loadingFrench,
    italian: loadingItalian,
    spanish: loadingSpanish,
    german: loadingGerman,
    poetry: loadingPoetry,
    english: loadingEnglish,
    philosophers: loadingPhilosophers,
    historical: loadingHistorical,
  };

  const findCollectionKey = (book) => {
    for (const col of collections) {
      if (col.items.some(item => item.id === book.id)) {
        return col.key;
      }
    }
    return null; // Should not happen if book is from a known collection
  };

  const handleCustomUrl = async (e) => {
    e.preventDefault();
    setCustomError('');
    if (!customUrl.trim()) return;
    setCustomLoading(true);
    try {
      const res = await fetch(`/api/fetch-gutenberg?url=${encodeURIComponent(customUrl.trim())}`);
      if (!res.ok) {
        // Try to get the specific error message from the response
        let errorMessage = 'Failed to fetch text from the provided URL.';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          // If JSON parsing fails, use a generic message based on status code
          if (res.status === 413) {
            errorMessage = 'The file is too large for URL processing. Please upload it directly instead.';
          } else if (res.status === 400) {
            errorMessage = 'The URL could not be processed. Please check the URL or try uploading the file directly.';
          }
        }
        throw new Error(errorMessage);
      }
      const text = await res.text();
      if (!text || text.length < 100) throw new Error('The file appears to be empty or too short.');
      localStorage.setItem('explainer:bookText', text);
      localStorage.setItem('explainer:bookTitle', customUrl.trim());
      router.push('/home');
    } catch (err) {
      setCustomError(err.message || 'Failed to load the text.');
    } finally {
      setCustomLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileUploadLoading(true);
    setFileUploadError('');
    setFileUploadType(file.type);
    setFileUploadSize(file.size);

    try {
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        // Handle text files
        const text = await file.text();
        console.log('Library: Uploading text file:', {
          fileName: file.name,
          textLength: text.length,
          textPreview: text.substring(0, 100) + '...'
        });
        sessionStorage.setItem('explainer:bookText', text);
        sessionStorage.setItem('explainer:bookTitle', file.name);
        sessionStorage.removeItem('explainer:pdfData'); // Clear any previous PDF data
        console.log('Library: Text file stored in sessionStorage, navigating to /home');
        router.push('/home');
      } else {
        // Only text files are supported
        throw new Error('Only .txt files are supported. Please select a text file.');
      }
    } catch (err) {
      console.error('File upload error:', err);
      setFileUploadError(err.message || 'Failed to load the file.');
    } finally {
      setFileUploadLoading(false);
      setFileUploadType(''); // Clear file type
      setFileUploadSize(0); // Clear file size
      // Reset the file input
      e.target.value = '';
    }
  };



  // Responsive grid for the whole page: up to 3 columns if space allows
  const pageGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 32,
    marginTop: 24,
    maxWidth: 1200,
    marginLeft: 0,
    marginRight: 0,
  };

  // Responsive grid for books inside each collection: 1 column always
  const bookGridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 0,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 0 }}>
      <div style={{ maxWidth: 1200, margin: 0, padding: '40px 16px 64px 16px' }}>
        {/* Recently Viewed Section */}
        {recentBooks.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Clock size={18} style={{ color: '#3b82f6' }} />
              <span style={{ fontWeight: 700, fontSize: 18, color: '#1e293b' }}>Recently Viewed</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {recentBooks.map((book, i) => (
                <button
                  key={book.id + book.title}
                  onClick={() => handlerMap[findCollectionKey(book)]?.(book)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#fff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: 15,
                    fontWeight: 500,
                    color: '#2563eb',
                    cursor: 'pointer',
                    boxShadow: '0 1px 4px #0001',
                    transition: 'background 0.15s',
                  }}
                  title={book.title + (book.author ? ' by ' + book.author : '')}
                >
                  <span style={{ fontSize: 16, marginRight: 4 }}>📖</span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{book.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <a href="/home" style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 8,
            color: '#3b82f6', 
            textDecoration: 'none', 
            fontWeight: 500,
            fontSize: 16,
            padding: '8px 12px',
            borderRadius: 8,
            transition: 'background-color 0.2s',
            ':hover': { backgroundColor: '#f3f4f6' }
          }}>
            <ArrowLeft size={20} />
            {t('backToApp', lang)}
          </a>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1, color: 'black', margin: 0 }}>Library</h1>
        </div>
        <p style={{ color: 'black', fontSize: 18, marginBottom: 32 }}>
          {t('exploreLibrary', lang)}
        </p>
        {/* Custom URL input UI */}
        <form onSubmit={handleCustomUrl} style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <input
            type="url"
            value={customUrl}
            onChange={e => setCustomUrl(e.target.value)}
            placeholder="Paste a URL to a text file or web page (e.g. Project Gutenberg, articles, etc.)"
            style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 16, background: '#fffbe8' }}
            disabled={customLoading}
            required
          />
          <button
            type="submit"
            style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 600, fontSize: 16, cursor: 'pointer', minWidth: 90 }}
            disabled={customLoading}
          >
            {customLoading ? t('loading', lang) : 'Load'}
          </button>
        </form>
        {customError && <div style={{ color: '#dc2626', marginBottom: 16, fontWeight: 500 }}>{customError}</div>}
        <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 16 }}>
          💡 <strong>Tip:</strong> Upload text files (.txt) to analyze them with The Explainer.
        </div>
        
        {/* File upload UI */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
          <label
            htmlFor="file-upload"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 16,
              cursor: fileUploadLoading ? 'wait' : 'pointer',
              opacity: fileUploadLoading ? 0.6 : 1,
              transition: 'all 0.2s',
              minWidth: 140,
            }}
            onMouseOver={e => !fileUploadLoading && (e.target.style.background = '#059669')}
            onMouseOut={e => !fileUploadLoading && (e.target.style.background = '#10b981')}
          >
            📁 {fileUploadLoading ? t('loading', lang) : t('uploadFile', lang)}
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            disabled={fileUploadLoading}
          />
          <span style={{ color: '#6b7280', fontSize: 14 }}>
            {t('uploadFileDesc', lang)}
          </span>
        </div>
        {fileUploadError && <div style={{ color: '#dc2626', marginBottom: 16, fontWeight: 500 }}>{fileUploadError}</div>}
        <div style={{ ...pageGridStyle, marginLeft: 0, marginRight: 0 }}>
          {collections.map((col) => {
            const meta = collectionMeta[col.key] || {};
            return (
              <div
                key={col.key}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  boxShadow: '0 2px 12px #0001',
                  padding: 0,
                  overflow: 'hidden', // prevent overflow
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 220,
                  border: '1px solid #e5e7eb',
                  marginBottom: 32,
                  minWidth: 0, // allow flex children to shrink
                }}
              >
                {/* Accent bar */}
                <div style={{
                  background: meta.color || '#f3f4f6',
                  height: 8,
                  width: '100%',
                }} />
                <div style={{ padding: '18px 18px 10px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 24, marginRight: 8 }}>{meta.emoji}</span>
                    <h2
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        margin: 0,
                        color: 'black',
                        cursor: 'pointer',
                        flex: 1,
                        letterSpacing: -0.5,
                        transition: 'color 0.2s',
                      }}
                      onClick={() => setExpanded((prev) => ({ ...prev, [col.key]: !prev[col.key] }))}
                      tabIndex={0}
                    >
                      {col.title}
                    </h2>
                  </div>
                  {/* Book grid: 2 columns desktop, 1 column mobile */}
                  <div
                    style={bookGridStyle}
                  >
                    {col.key === 'french' && col.authorSections ? (
                      // Special rendering for French collection organized by author
                      (expanded[col.key] ? col.authorSections : col.authorSections.slice(0, 3)).map((section, sectionIndex) => (
                        <div key={section.author}>
                          {/* Author header */}
                          <div
                            style={{
                              padding: '14px 8px 8px 8px', // more vertical padding
                              background: '#f8fafc',
                              borderBottom: '1px solid #e2e8f0',
                              fontWeight: 600,
                              fontSize: 14,
                              color: '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              minWidth: 0,
                              width: '100%',
                            }}
                          >
                            <span style={{ flex: '1 1 0%', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 800, fontSize: 18, color: '#1e293b', letterSpacing: '-0.5px' }}>{section.author}</span>
                          </div>
                          {/* Books by this author */}
                          {(expanded[`${col.key}-${section.author}`] ? section.books : section.books.slice(0, 5)).map((item, i) => {
                            const isSelected = selectedItem?.collectionKey === col.key && selectedItem?.itemId === item[col.itemKey];
                            const isLoading = loadingMap[col.key] === item[col.itemKey];
                            const hasBorder = i < (expanded[`${col.key}-${section.author}`] ? section.books.length : Math.min(4, section.books.length - 1)) - 1;
                            return (
                              <div
                                key={`${item[col.itemKey]}-${i}`}
                                style={{
                                  ...getItemContainerStyle(isSelected, hasBorder),
                                  paddingLeft: '16px', // Indent books under author
                                }}
                              >
                                <span
                                  onClick={() => handleItemClick(col.key, item, handlerMap[col.key])}
                                  style={getClickableItemStyle(isSelected, isLoading)}
                                  title={item.title}
                                  onMouseOver={e => !isSelected && !isLoading && (e.target.style.color = '#666')}
                                  onMouseOut={e => !isSelected && !isLoading && (e.target.style.color = 'black')}
                                >
                                  {isLoading
                                    ? t('loading', lang)
                                    : item.title}
                                </span>
                              </div>
                            );
                          })}
                          {/* More/Less button for author */}
                          {section.books.length > 5 && (
                            <button
                              onClick={() => setExpanded((prev) => ({ ...prev, [`${col.key}-${section.author}`]: !prev[`${col.key}-${section.author}`] }))}
                              style={{
                                margin: '8px 0 8px 16px',
                                background: '#e0e7ef',
                                color: '#2563eb',
                                border: 'none',
                                borderRadius: 6,
                                padding: '2px 10px',
                                fontWeight: 500,
                                fontSize: 13,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                boxShadow: '0 1px 2px #0001',
                              }}
                              title={expanded[`${col.key}-${section.author}`] ? `Show fewer works by ${section.author}` : `Show more works by ${section.author}`}
                            >
                              <span>{expanded[`${col.key}-${section.author}`] ? '➖' : '➕'}</span>
                              {expanded[`${col.key}-${section.author}`]
                                ? `Show less by ${section.author}`
                                : `Show more by ${section.author}`}
                            </button>
                          )}
                        </div>
                      ))
                    ) : col.key === 'italian' && col.authorSections ? (
                      (expanded[col.key] ? col.authorSections : col.authorSections.slice(0, 3)).map((section, sectionIndex) => (
                        <div key={section.author}>
                          {/* Author header */}
                          <div
                            style={{
                              padding: '14px 8px 8px 8px',
                              background: '#f8fafc',
                              borderBottom: '1px solid #e2e8f0',
                              fontWeight: 600,
                              fontSize: 14,
                              color: '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              minWidth: 0,
                              width: '100%',
                            }}
                          >
                            <span style={{ flex: '1 1 0%', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 800, fontSize: 18, color: '#1e293b', letterSpacing: '-0.5px' }}>{section.author}</span>
                          </div>
                          {/* Books by this author */}
                          {(expanded[`${col.key}-${section.author}`] ? section.books : section.books.slice(0, 5)).map((item, i) => {
                            const isSelected = selectedItem?.collectionKey === col.key && selectedItem?.itemId === item[col.itemKey];
                            const isLoading = loadingMap[col.key] === item[col.itemKey];
                            const hasBorder = i < (expanded[`${col.key}-${section.author}`] ? section.books.length : Math.min(4, section.books.length - 1)) - 1;
                            return (
                              <div
                                key={`${item[col.itemKey]}-${i}`}
                                style={{
                                  ...getItemContainerStyle(isSelected, hasBorder),
                                  paddingLeft: '16px', // Indent books under author
                                }}
                              >
                                <span
                                  onClick={() => handleItemClick(col.key, item, handlerMap[col.key])}
                                  style={getClickableItemStyle(isSelected, isLoading)}
                                  title={item.title}
                                  onMouseOver={e => !isSelected && !isLoading && (e.target.style.color = '#666')}
                                  onMouseOut={e => !isSelected && !isLoading && (e.target.style.color = 'black')}
                                >
                                  {isLoading
                                    ? t('loading', lang)
                                    : item.title}
                                </span>
                              </div>
                            );
                          })}
                          {/* More/Less button for author */}
                          {section.books.length > 5 && (
                            <button
                              onClick={() => setExpanded((prev) => ({ ...prev, [`${col.key}-${section.author}`]: !prev[`${col.key}-${section.author}`] }))}
                              style={{
                                margin: '8px 0 8px 16px',
                                background: '#e0e7ef',
                                color: '#2563eb',
                                border: 'none',
                                borderRadius: 6,
                                padding: '2px 10px',
                                fontWeight: 500,
                                fontSize: 13,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                boxShadow: '0 1px 2px #0001',
                              }}
                              title={expanded[`${col.key}-${section.author}`] ? `Show fewer works by ${section.author}` : `Show more works by ${section.author}`}
                            >
                              <span>{expanded[`${col.key}-${section.author}`] ? '➖' : '➕'}</span>
                              {expanded[`${col.key}-${section.author}`]
                                ? `Show less by ${section.author}`
                                : `Show more by ${section.author}`}
                            </button>
                          )}
                        </div>
                      ))
                    ) : col.key === 'spanish' && col.authorSections ? (
                      (expanded[col.key] ? col.authorSections : col.authorSections.slice(0, 3)).map((section, sectionIndex) => (
                        <div key={section.author}>
                          {/* Author header */}
                          <div
                            style={{
                              padding: '14px 8px 8px 8px',
                              background: '#f8fafc',
                              borderBottom: '1px solid #e2e8f0',
                              fontWeight: 600,
                              fontSize: 14,
                              color: '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              minWidth: 0,
                              width: '100%',
                            }}
                          >
                            <span style={{ flex: '1 1 0%', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 800, fontSize: 18, color: '#1e293b', letterSpacing: '-0.5px' }}>{section.author}</span>
                          </div>
                          {/* Books by this author */}
                          {(expanded[`${col.key}-${section.author}`] ? section.books : section.books.slice(0, 5)).map((item, i) => (
                            <div
                              key={`${item[col.itemKey]}-${i}`}
                              style={{
                                padding: '6px 8px',
                                borderBottom: (i < (expanded[`${col.key}-${section.author}`] ? section.books.length : Math.min(4, section.books.length - 1)) - 1) ? '1px solid #f1f5f9' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                minWidth: 0,
                                maxWidth: '100%',
                                paddingLeft: '16px', // Indent books under author
                              }}
                            >
                              <span
                                onClick={() => handlerMap[col.key](item)}
                                style={{
                                  color: 'black',
                                  cursor: loadingMap[col.key] === item[col.itemKey] ? 'wait' : 'pointer',
                                  textDecoration: 'underline',
                                  fontWeight: 500,
                                  fontSize: 15,
                                  opacity: loadingMap[col.key] === item[col.itemKey] ? 0.6 : 1,
                                  transition: 'color 0.2s',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '100%',
                                  display: 'inline-block',
                                }}
                                title={item.title}
                                onMouseOver={e => e.target.style.color = '#666'}
                                onMouseOut={e => e.target.style.color = 'black'}
                              >
                                {loadingMap[col.key] === item[col.itemKey]
                                  ? t('loading', lang)
                                  : item.title}
                              </span>
                            </div>
                          ))}
                          {/* More/Less button for author */}
                          {section.books.length > 5 && (
                            <button
                              onClick={() => setExpanded((prev) => ({ ...prev, [`${col.key}-${section.author}`]: !prev[`${col.key}-${section.author}`] }))}
                              style={{
                                margin: '8px 0 8px 16px',
                                background: '#e0e7ef',
                                color: '#2563eb',
                                border: 'none',
                                borderRadius: 6,
                                padding: '2px 10px',
                                fontWeight: 500,
                                fontSize: 13,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                boxShadow: '0 1px 2px #0001',
                              }}
                              title={expanded[`${col.key}-${section.author}`] ? `Show fewer works by ${section.author}` : `Show more works by ${section.author}`}
                            >
                              <span>{expanded[`${col.key}-${section.author}`] ? '➖' : '➕'}</span>
                              {expanded[`${col.key}-${section.author}`]
                                ? `Show less by ${section.author}`
                                : `Show more by ${section.author}`}
                            </button>
                          )}
                        </div>
                      ))
                    ) : col.key === 'spanish' && col.authorSections ? (
                      (expanded[col.key] ? col.authorSections : col.authorSections.slice(0, 3)).map((section, sectionIndex) => (
                        <div key={section.author}>
                          {/* Author header */}
                          <div
                            style={{
                              padding: '14px 8px 8px 8px',
                              background: '#f8fafc',
                              borderBottom: '1px solid #e2e8f0',
                              fontWeight: 600,
                              fontSize: 14,
                              color: '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              minWidth: 0,
                              width: '100%',
                            }}
                          >
                            <span style={{ flex: '1 1 0%', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 800, fontSize: 18, color: '#1e293b', letterSpacing: '-0.5px' }}>{section.author}</span>
                          </div>
                          {/* Books by this author */}
                          {(expanded[`${col.key}-${section.author}`] ? section.books : section.books.slice(0, 5)).map((item, i) => (
                            <div
                              key={`${item[col.itemKey]}-${i}`}
                              style={{
                                padding: '6px 8px',
                                borderBottom: (i < (expanded[`${col.key}-${section.author}`] ? section.books.length : Math.min(4, section.books.length - 1)) - 1) ? '1px solid #f1f5f9' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                minWidth: 0,
                                maxWidth: '100%',
                                paddingLeft: '16px', // Indent books under author
                              }}
                            >
                              <span
                                onClick={() => handlerMap[col.key](item)}
                                style={{
                                  color: 'black',
                                  cursor: loadingMap[col.key] === item[col.itemKey] ? 'wait' : 'pointer',
                                  textDecoration: 'underline',
                                  fontWeight: 500,
                                  fontSize: 15,
                                  opacity: loadingMap[col.key] === item[col.itemKey] ? 0.6 : 1,
                                  transition: 'color 0.2s',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '100%',
                                  display: 'inline-block',
                                }}
                                title={item.title}
                                onMouseOver={e => e.target.style.color = '#666'}
                                onMouseOut={e => e.target.style.color = 'black'}
                              >
                                {loadingMap[col.key] === item[col.itemKey]
                                  ? t('loading', lang)
                                  : item.title}
                              </span>
                            </div>
                          ))}
                          {/* More/Less button for author */}
                          {section.books.length > 5 && (
                            <button
                              onClick={() => setExpanded((prev) => ({ ...prev, [`${col.key}-${section.author}`]: !prev[`${col.key}-${section.author}`] }))}
                              style={{
                                margin: '8px 0 8px 16px',
                                background: '#e0e7ef',
                                color: '#2563eb',
                                border: 'none',
                                borderRadius: 6,
                                padding: '2px 10px',
                                fontWeight: 500,
                                fontSize: 13,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                boxShadow: '0 1px 2px #0001',
                              }}
                              title={expanded[`${col.key}-${section.author}`] ? `Show fewer works by ${section.author}` : `Show more works by ${section.author}`}
                            >
                              <span>{expanded[`${col.key}-${section.author}`] ? '➖' : '➕'}</span>
                              {expanded[`${col.key}-${section.author}`]
                                ? `Show less by ${section.author}`
                                : `Show more by ${section.author}`}
                            </button>
                          )}
                        </div>
                      ))
                    ) : col.key === 'german' && col.authorSections ? (
                      (expanded[col.key] ? col.authorSections : col.authorSections.slice(0, 3)).map((section, sectionIndex) => (
                        <div key={section.author}>
                          {/* Author header */}
                          <div
                            style={{
                              padding: '14px 8px 8px 8px',
                              background: '#f8fafc',
                              borderBottom: '1px solid #e2e8f0',
                              fontWeight: 600,
                              fontSize: 14,
                              color: '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              minWidth: 0,
                              width: '100%',
                            }}
                          >
                            <span style={{ flex: '1 1 0%', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 800, fontSize: 18, color: '#1e293b', letterSpacing: '-0.5px' }}>{section.author}</span>
                          </div>
                          {/* Books by this author */}
                          {(expanded[`${col.key}-${section.author}`] ? section.books : section.books.slice(0, 5)).map((item, i) => (
                            <div
                              key={`${item[col.itemKey]}-${i}`}
                              style={{
                                padding: '6px 8px',
                                borderBottom: (i < (expanded[`${col.key}-${section.author}`] ? section.books.length : Math.min(4, section.books.length - 1)) - 1) ? '1px solid #f1f5f9' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                minWidth: 0,
                                maxWidth: '100%',
                                paddingLeft: '16px', // Indent books under author
                              }}
                            >
                              <span
                                onClick={() => handlerMap[col.key](item)}
                                style={{
                                  color: 'black',
                                  cursor: loadingMap[col.key] === item[col.itemKey] ? 'wait' : 'pointer',
                                  textDecoration: 'underline',
                                  fontWeight: 500,
                                  fontSize: 15,
                                  opacity: loadingMap[col.key] === item[col.itemKey] ? 0.6 : 1,
                                  transition: 'color 0.2s',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '100%',
                                  display: 'inline-block',
                                }}
                                title={item.title}
                                onMouseOver={e => e.target.style.color = '#666'}
                                onMouseOut={e => e.target.style.color = 'black'}
                              >
                                {loadingMap[col.key] === item[col.itemKey]
                                  ? t('loading', lang)
                                  : item.title}
                              </span>
                            </div>
                          ))}
                          {/* More/Less button for author */}
                          {section.books.length > 5 && (
                            <button
                              onClick={() => setExpanded((prev) => ({ ...prev, [`${col.key}-${section.author}`]: !prev[`${col.key}-${section.author}`] }))}
                              style={{
                                margin: '8px 0 8px 16px',
                                background: '#e0e7ef',
                                color: '#2563eb',
                                border: 'none',
                                borderRadius: 6,
                                padding: '2px 10px',
                                fontWeight: 500,
                                fontSize: 13,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                boxShadow: '0 1px 2px #0001',
                              }}
                              title={expanded[`${col.key}-${section.author}`] ? `Show fewer works by ${section.author}` : `Show more works by ${section.author}`}
                            >
                              <span>{expanded[`${col.key}-${section.author}`] ? '➖' : '➕'}</span>
                              {expanded[`${col.key}-${section.author}`]
                                ? `Show less by ${section.author}`
                                : `Show more by ${section.author}`}
                            </button>
                          )}
                        </div>
                      ))
                    ) : col.key === 'poetry' && col.authorSections ? (
                      (expanded[col.key] ? col.authorSections : col.authorSections.slice(0, 3)).map((section, sectionIndex) => (
                        <div key={section.author}>
                          {/* Author header */}
                          <div
                            style={{
                              padding: '14px 8px 8px 8px',
                              background: '#f8fafc',
                              borderBottom: '1px solid #e2e8f0',
                              fontWeight: 600,
                              fontSize: 14,
                              color: '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              minWidth: 0,
                              width: '100%',
                            }}
                          >
                            <span style={{ flex: '1 1 0%', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 800, fontSize: 18, color: '#1e293b', letterSpacing: '-0.5px' }}>{section.author}</span>
                          </div>
                          {/* Books by this author */}
                          {(expanded[`${col.key}-${section.author}`] ? section.books : section.books.slice(0, 5)).map((item, i) => (
                            <div
                              key={`${item[col.itemKey]}-${i}`}
                              style={{
                                padding: '6px 8px',
                                borderBottom: (i < (expanded[`${col.key}-${section.author}`] ? section.books.length : Math.min(4, section.books.length - 1)) - 1) ? '1px solid #f1f5f9' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                minWidth: 0,
                                maxWidth: '100%',
                                paddingLeft: '16px', // Indent books under author
                              }}
                            >
                              <span
                                onClick={() => handlerMap[col.key](item)}
                                style={{
                                  color: 'black',
                                  cursor: loadingMap[col.key] === item[col.itemKey] ? 'wait' : 'pointer',
                                  textDecoration: 'underline',
                                  fontWeight: 500,
                                  fontSize: 15,
                                  opacity: loadingMap[col.key] === item[col.itemKey] ? 0.6 : 1,
                                  transition: 'color 0.2s',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '100%',
                                  display: 'inline-block',
                                }}
                                title={item.title}
                                onMouseOver={e => e.target.style.color = '#666'}
                                onMouseOut={e => e.target.style.color = 'black'}
                              >
                                {loadingMap[col.key] === item[col.itemKey]
                                  ? t('loading', lang)
                                  : item.title}
                              </span>
                            </div>
                          ))}
                          {/* More/Less button for author */}
                          {section.books.length > 5 && (
                            <button
                              onClick={() => setExpanded((prev) => ({ ...prev, [`${col.key}-${section.author}`]: !prev[`${col.key}-${section.author}`] }))}
                              style={{
                                margin: '8px 0 8px 16px',
                                background: '#e0e7ef',
                                color: '#2563eb',
                                border: 'none',
                                borderRadius: 6,
                                padding: '2px 10px',
                                fontWeight: 500,
                                fontSize: 13,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                boxShadow: '0 1px 2px #0001',
                              }}
                              title={expanded[`${col.key}-${section.author}`] ? `Show fewer works by ${section.author}` : `Show more works by ${section.author}`}
                            >
                              <span>{expanded[`${col.key}-${section.author}`] ? '➖' : '➕'}</span>
                              {expanded[`${col.key}-${section.author}`]
                                ? `Show less by ${section.author}`
                                : `Show more by ${section.author}`}
                            </button>
                          )}
                        </div>
                      ))
                    ) : col.key === 'philosophers' && col.authorSections ? (
                      (expanded[col.key] ? col.authorSections : col.authorSections.slice(0, 3)).map((section, sectionIndex) => (
                        <div key={section.author}>
                          {/* Author header */}
                          <div
                            style={{
                              padding: '14px 8px 8px 8px',
                              background: '#f8fafc',
                              borderBottom: '1px solid #e2e8f0',
                              fontWeight: 600,
                              fontSize: 14,
                              color: '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              minWidth: 0,
                              width: '100%',
                            }}
                          >
                            <span style={{ flex: '1 1 0%', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 800, fontSize: 18, color: '#1e293b', letterSpacing: '-0.5px' }}>{section.author}</span>
                          </div>
                          {/* Books by this author */}
                          {(expanded[`${col.key}-${section.author}`] ? section.books : section.books.slice(0, 5)).map((item, i) => {
                            const isSelected = selectedItem?.collectionKey === col.key && selectedItem?.itemId === item[col.itemKey];
                            const isLoading = loadingMap[col.key] === item[col.itemKey];
                            const hasBorder = i < (expanded[`${col.key}-${section.author}`] ? section.books.length : Math.min(4, section.books.length - 1)) - 1;
                            return (
                              <div
                                key={`${item[col.itemKey]}-${i}`}
                                style={{
                                  ...getItemContainerStyle(isSelected, hasBorder),
                                  paddingLeft: '16px', // Indent books under author
                                }}
                              >
                                <span
                                  onClick={() => handleItemClick(col.key, item, handlerMap[col.key])}
                                  style={getClickableItemStyle(isSelected, isLoading)}
                                  title={item.title}
                                  onMouseOver={e => !isSelected && !isLoading && (e.target.style.color = '#666')}
                                  onMouseOut={e => !isSelected && !isLoading && (e.target.style.color = 'black')}
                                >
                                  {isLoading
                                    ? t('loading', lang)
                                    : item.title}
                                </span>
                              </div>
                            );
                          })}
                          {/* More/Less button for author */}
                          {section.books.length > 5 && (
                            <button
                              onClick={() => setExpanded((prev) => ({ ...prev, [`${col.key}-${section.author}`]: !prev[`${col.key}-${section.author}`] }))}
                              style={{
                                margin: '8px 0 8px 16px',
                                background: '#e0e7ef',
                                color: '#2563eb',
                                border: 'none',
                                borderRadius: 6,
                                padding: '2px 10px',
                                fontWeight: 500,
                                fontSize: 13,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                boxShadow: '0 1px 2px #0001',
                              }}
                              title={expanded[`${col.key}-${section.author}`] ? `Show fewer works by ${section.author}` : `Show more works by ${section.author}`}
                            >
                              <span>{expanded[`${col.key}-${section.author}`] ? '➖' : '➕'}</span>
                              {expanded[`${col.key}-${section.author}`]
                                ? `Show less by ${section.author}`
                                : `Show more by ${section.author}`}
                            </button>
                          )}
                        </div>
                      ))
                    ) : col.key === 'english' && col.authorSections ? (
                      (expanded[col.key] ? col.authorSections : col.authorSections.slice(0, 3)).map((section, sectionIndex) => (
                        <div key={section.author}>
                          {/* Author header */}
                          <div
                            style={{
                              padding: '14px 8px 8px 8px',
                              background: '#f8fafc',
                              borderBottom: '1px solid #e2e8f0',
                              fontWeight: 600,
                              fontSize: 14,
                              color: '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              minWidth: 0,
                              width: '100%',
                            }}
                          >
                            <span style={{ flex: '1 1 0%', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 800, fontSize: 18, color: '#1e293b', letterSpacing: '-0.5px' }}>{section.author}</span>
                          </div>
                          {/* Books by this author */}
                          {(expanded[`${col.key}-${section.author}`] ? section.books : section.books.slice(0, 5)).map((item, i) => (
                            <div
                              key={`${item[col.itemKey]}-${i}`}
                              style={{
                                padding: '6px 8px',
                                borderBottom: (i < (expanded[`${col.key}-${section.author}`] ? section.books.length : Math.min(4, section.books.length - 1)) - 1) ? '1px solid #f1f5f9' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                minWidth: 0,
                                maxWidth: '100%',
                                paddingLeft: '16px', // Indent books under author
                              }}
                            >
                              <span
                                onClick={() => handlerMap[col.key](item)}
                                style={{
                                  color: 'black',
                                  cursor: loadingMap[col.key] === item[col.itemKey] ? 'wait' : 'pointer',
                                  textDecoration: 'underline',
                                  fontWeight: 500,
                                  fontSize: 15,
                                  opacity: loadingMap[col.key] === item[col.itemKey] ? 0.6 : 1,
                                  transition: 'color 0.2s',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '100%',
                                  display: 'inline-block',
                                }}
                                title={item.title}
                                onMouseOver={e => e.target.style.color = '#666'}
                                onMouseOut={e => e.target.style.color = 'black'}
                              >
                                {loadingMap[col.key] === item[col.itemKey]
                                  ? t('loading', lang)
                                  : item.title}
                              </span>
                            </div>
                          ))}
                          {/* More/Less button for author */}
                          {section.books.length > 5 && (
                            <button
                              onClick={() => setExpanded((prev) => ({ ...prev, [`${col.key}-${section.author}`]: !prev[`${col.key}-${section.author}`] }))}
                              style={{
                                margin: '8px 0 8px 16px',
                                background: '#e0e7ef',
                                color: '#2563eb',
                                border: 'none',
                                borderRadius: 6,
                                padding: '2px 10px',
                                fontWeight: 500,
                                fontSize: 13,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                boxShadow: '0 1px 2px #0001',
                              }}
                              title={expanded[`${col.key}-${section.author}`] ? `Show fewer works by ${section.author}` : `Show more works by ${section.author}`}
                            >
                              <span>{expanded[`${col.key}-${section.author}`] ? '➖' : '➕'}</span>
                              {expanded[`${col.key}-${section.author}`]
                                ? `Show less by ${section.author}`
                                : `Show more by ${section.author}`}
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      // Regular rendering for other collections
                      (expanded[col.key] ? col.items : col.items.slice(0, 10)).map((item, i) => {
                        const isSelected = selectedItem?.collectionKey === col.key && selectedItem?.itemId === item[col.itemKey];
                        const isLoading = loadingMap[col.key] === item[col.itemKey];
                        const hasBorder = i < (expanded[col.key] ? col.items.length : Math.min(9, col.items.length - 1)) - 1;
                        return (
                          <div
                            key={`${item[col.itemKey]}-${i}`}
                            style={getItemContainerStyle(isSelected, hasBorder)}
                          >
                            <span
                              onClick={() => handleItemClick(col.key, item, handlerMap[col.key])}
                              style={getClickableItemStyle(isSelected, isLoading)}
                              title={`${item.title}${item.author ? ' by ' + item.author : ''}`}
                              onMouseOver={e => !isSelected && !isLoading && (e.target.style.color = '#666')}
                              onMouseOut={e => !isSelected && !isLoading && (e.target.style.color = 'black')}
                            >
                              {isLoading
                                ? t('loading', lang)
                                : `${item.title}${item.author ? ' by ' + item.author : ''}`}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {/* More/Less button at the bottom */}
                  {col.key === 'french' && col.authorSections && col.authorSections.length > 3 && (
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [col.key]: !prev[col.key] }))}
                      style={{
                        margin: '16px auto 0 auto',
                        display: 'block',
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        border: 'none',
                        borderRadius: 10,
                        padding: '10px 28px',
                        fontWeight: 700,
                        fontSize: 17,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px #0001',
                        letterSpacing: 0.2,
                        alignItems: 'center',
                      }}
                      title={expanded[col.key] ? 'Show fewer authors in this collection' : 'Show more authors in this collection'}
                    >
                      <span style={{fontSize: 20, marginRight: 8}}>👥</span>
                      {expanded[col.key] ? 'Less' : 'More'}
                    </button>
                  )}
                  {col.key === 'italian' && col.authorSections && col.authorSections.length > 3 && (
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [col.key]: !prev[col.key] }))}
                      style={{
                        margin: '16px auto 0 auto',
                        display: 'block',
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        border: 'none',
                        borderRadius: 10,
                        padding: '10px 28px',
                        fontWeight: 700,
                        fontSize: 17,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px #0001',
                        letterSpacing: 0.2,
                        alignItems: 'center',
                      }}
                      title={expanded[col.key] ? 'Show fewer authors in this collection' : 'Show more authors in this collection'}
                    >
                      <span style={{fontSize: 20, marginRight: 8}}>👥</span>
                      {expanded[col.key] ? 'Less' : 'More'}
                    </button>
                  )}
                  {col.key === 'spanish' && col.authorSections && col.authorSections.length > 3 && (
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [col.key]: !prev[col.key] }))}
                      style={{
                        margin: '16px auto 0 auto',
                        display: 'block',
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        border: 'none',
                        borderRadius: 10,
                        padding: '10px 28px',
                        fontWeight: 700,
                        fontSize: 17,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px #0001',
                        letterSpacing: 0.2,
                        alignItems: 'center',
                      }}
                      title={expanded[col.key] ? 'Show fewer authors in this collection' : 'Show more authors in this collection'}
                    >
                      <span style={{fontSize: 20, marginRight: 8}}>👥</span>
                      {expanded[col.key] ? 'Less' : 'More'}
                    </button>
                  )}
                  {col.key === 'german' && col.authorSections && col.authorSections.length > 3 && (
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [col.key]: !prev[col.key] }))}
                      style={{
                        margin: '16px auto 0 auto',
                        display: 'block',
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        border: 'none',
                        borderRadius: 10,
                        padding: '10px 28px',
                        fontWeight: 700,
                        fontSize: 17,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px #0001',
                        letterSpacing: 0.2,
                        alignItems: 'center',
                      }}
                      title={expanded[col.key] ? 'Show fewer authors in this collection' : 'Show more authors in this collection'}
                    >
                      <span style={{fontSize: 20, marginRight: 8}}>👥</span>
                      {expanded[col.key] ? 'Less' : 'More'}
                    </button>
                  )}
                  {col.key === 'poetry' && col.authorSections && col.authorSections.length > 3 && (
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [col.key]: !prev[col.key] }))}
                      style={{
                        margin: '16px auto 0 auto',
                        display: 'block',
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        border: 'none',
                        borderRadius: 10,
                        padding: '10px 28px',
                        fontWeight: 700,
                        fontSize: 17,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px #0001',
                        letterSpacing: 0.2,
                        alignItems: 'center',
                      }}
                      title={expanded[col.key] ? 'Show fewer authors in this collection' : 'Show more authors in this collection'}
                    >
                      <span style={{fontSize: 20, marginRight: 8}}>👥</span>
                      {expanded[col.key] ? 'Less' : 'More'}
                    </button>
                  )}
                  {col.key === 'english' && col.authorSections && col.authorSections.length > 3 && (
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [col.key]: !prev[col.key] }))}
                      style={{
                        margin: '16px auto 0 auto',
                        display: 'block',
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        border: 'none',
                        borderRadius: 10,
                        padding: '10px 28px',
                        fontWeight: 700,
                        fontSize: 17,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px #0001',
                        letterSpacing: 0.2,
                        alignItems: 'center',
                      }}
                      title={expanded[col.key] ? 'Show fewer authors in this collection' : 'Show more authors in this collection'}
                    >
                      <span style={{fontSize: 20, marginRight: 8}}>👥</span>
                      {expanded[col.key] ? 'Less' : 'More'}
                    </button>
                  )}
                  {col.key !== 'french' && col.key !== 'italian' && col.key !== 'spanish' && col.key !== 'german' && col.key !== 'poetry' && col.key !== 'english' && col.key !== 'shakespeare' && col.key !== 'top100' && col.items.length > 10 && (
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [col.key]: !prev[col.key] }))}
                      style={{
                        margin: '16px auto 0 auto',
                        display: 'block',
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        border: 'none',
                        borderRadius: 10,
                        padding: '10px 28px',
                        fontWeight: 700,
                        fontSize: 17,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px #0001',
                        letterSpacing: 0.2,
                        alignItems: 'center',
                      }}
                      title={expanded[col.key] ? 'Show fewer works in this collection' : 'Show more works in this collection'}
                    >
                      <span style={{fontSize: 20, marginRight: 8}}>👥</span>
                      {expanded[col.key] ? 'Less' : 'More'}
                    </button>
                  )}
                  {col.key === 'shakespeare' && col.items.length > 10 && (
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [col.key]: !prev[col.key] }))}
                      style={{
                        margin: '16px auto 0 auto',
                        display: 'block',
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        border: 'none',
                        borderRadius: 10,
                        padding: '10px 28px',
                        fontWeight: 700,
                        fontSize: 17,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px #0001',
                        letterSpacing: 0.2,
                        alignItems: 'center',
                      }}
                      title={expanded[col.key] ? 'Show fewer works in this collection' : 'Show more works in this collection'}
                    >
                      <span style={{fontSize: 20, marginRight: 8}}>👥</span>
                      {expanded[col.key] ? 'Less' : 'More'}
                    </button>
                  )}
                  {col.key === 'top100' && col.items.length > 10 && (
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [col.key]: !prev[col.key] }))}
                      style={{
                        margin: '16px auto 0 auto',
                        display: 'block',
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        border: 'none',
                        borderRadius: 10,
                        padding: '10px 28px',
                        fontWeight: 700,
                        fontSize: 17,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px #0001',
                        letterSpacing: 0.2,
                        alignItems: 'center',
                      }}
                      title={expanded[col.key] ? 'Show fewer works in this collection' : 'Show more works in this collection'}
                    >
                      <span style={{fontSize: 20, marginRight: 8}}>👥</span>
                      {expanded[col.key] ? 'Less' : 'More'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 