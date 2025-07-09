const https = require('https');
const http = require('http');

// All the book collections from the library
const top100 = [
  { id: '1342', title: 'Pride and Prejudice by Jane Austen' },
  { id: '84', title: 'Frankenstein; Or, The Modern Prometheus by Mary Wollstonecraft Shelley' },
  { id: '11', title: 'Alice\'s Adventures in Wonderland by Lewis Carroll' },
  { id: '1661', title: 'The Adventures of Sherlock Holmes by Arthur Conan Doyle' },
  { id: '2701', title: 'Moby Dick; Or, The Whale by Herman Melville' },
  { id: '98', title: 'A Tale of Two Cities by Charles Dickens' },
  { id: '74', title: 'The Adventures of Tom Sawyer by Mark Twain' },
  { id: '345', title: 'Dracula by Bram Stoker' },
  { id: '1952', title: 'The Yellow Wallpaper by Charlotte Perkins Gilman' },
  { id: '2542', title: 'A Doll\'s House by Henrik Ibsen' },
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
];

const shakespeareWorks = [
  { id: '1543', title: 'A Lover\'s Complaint' },
  { id: '1514', title: 'A Midsummer Night\'s Dream' },
  { id: '1529', title: 'All\'s Well That Ends Well' },
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
  { id: '1510', title: 'Love\'s Labour\'s Lost' },
  { id: '1533', title: 'Macbeth' },
  { id: '1530', title: 'Measure for Measure' },
  { id: '1545', title: 'Mucedorus' },
  { id: '1519', title: 'Much Ado About Nothing' },
  { id: '1520', title: 'Much Ado About Nothing' },
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
  { id: '1506', title: 'The Rape of Lucrece' },
  { id: '1508', title: 'The Taming of the Shrew' },
  { id: '1540', title: 'The Tempest' },
  { id: '1507', title: 'The Tragedy of Titus Andronicus' },
  { id: '1542', title: 'The Two Noble Kinsmen' },
  { id: '1539', title: 'The Winter\'s Tale' },
  { id: '1536', title: 'Timon of Athens' },
  { id: '1528', title: 'Troilus and Cressida' },
  { id: '1526', title: 'Twelfth Night' },
  { id: '1527', title: 'Twelfth Night' },
  { id: '1509', title: 'Two Gentlemen of Verona' },
  { id: '1045', title: 'Venus and Adonis' },
];

const frenchCollection = [
  { id: '17489', title: 'Les misérables Tome I: Fantine', author: 'Victor Hugo' },
  { id: '2650', title: 'Du côté de chez Swann', author: 'Marcel Proust' },
  { id: '28718', title: 'Les crimes de l\'amour', author: 'marquis de Sade' },
  { id: '13951', title: 'Les trois mousquetaires', author: 'Alexandre Dumas and Auguste Maquet' },
  { id: '17989', title: 'Le comte de Monte-Cristo, Tome I', author: 'Alexandre Dumas and Auguste Maquet' },
  { id: '4791', title: 'Voyage au Centre de la Terre', author: 'Jules Verne' },
  { id: '14287', title: 'L\'île mystérieuse', author: 'Jules Verne' },
  { id: '5097', title: 'Vingt mille Lieues Sous Les Mers — Complete', author: 'Jules Verne' },
  { id: '799', title: 'De la terre à la lune: trajet direct en 97 heures 20 minutes', author: 'Jules Verne' },
  { id: '38674', title: 'De la terre à la lune, trajet direct en 97 heures 20 minutes', author: 'Jules Verne' },
  { id: '20973', title: 'Le tour du monde en quatre-vingts jours', author: 'Jules Verne' },
  { id: '32854', title: 'Arsène Lupin, gentleman-cambrioleur', author: 'Maurice Leblanc' },
  { id: '14155', title: 'Madame Bovary', author: 'Gustave Flaubert' },
  { id: '798', title: 'Le rouge et le noir: chronique du XIXe siècle', author: 'Stendhal' },
  { id: '19657', title: 'Notre-Dame de Paris', author: 'Victor Hugo' },
  { id: '16816', title: 'Le roman de la rose - Tome I', author: 'de Lorris Guillaume and de Meun Jean' },
  { id: '16885', title: 'Aline et Valcour, ou Le Roman Philosophique. Tome 1', author: 'marquis de Sade' },
  { id: '40877', title: 'Caprices d\'un Bibliophile', author: 'Octave Uzanne' },
  { id: '43851', title: 'La Comédie humaine - Volume 02', author: 'Honoré de Balzac' },
  { id: '26685', title: 'Aphrodite: Moeurs antiques', author: 'Pierre Louÿs' },
  { id: '16820', title: 'Le Journal d\'une Femme de Chambre', author: 'Octave Mirbeau' },
  { id: '61239', title: 'Contes pour les bibliophiles', author: 'Octave Uzanne' },
  { id: '62215', title: 'Le Fantôme de l\'Opéra', author: 'Gaston Leroux' },
  { id: '54873', title: 'Vingt mille lieues sous les mers', author: 'Jules Verne' },
  { id: '17519', title: 'Les misérables Tome V: Jean Valjean', author: 'Victor Hugo' },
];

const germanCollection = [
  { id: '14075', title: 'Die Frauenfrage: ihre geschichtliche Entwicklung und wirtschaftliche Seite (German)', author: 'Lily Braun' },
  { id: '3221', title: 'Mr. Honey\'s Large Business Dictionary (English-German) (German)', author: 'Winfried Honig' },
  { id: '58804', title: 'Die Deutschen Familiennamen, geschichtlich, geographisch, sprachlich (German)', author: 'Albert Heintze' },
  { id: '3213', title: 'Mr. Honey\'s Beginner\'s Dictionary (English-German) (German)', author: 'Winfried Honig' },
  { id: '43759', title: 'Geflügelte Worte: Der Citatenschatz des deutschen Volkes (German)', author: 'Georg Büchmann and Walter Robert-tornow' },
  { id: '39762', title: 'Etymologisches Wörterbuch der deutschen Seemannssprache (German)', author: 'Gustav Goedel' },
  { id: '3220', title: 'Mr. Honey\'s Large Business Dictionary (German-English) (German)', author: 'Winfried Honig' },
  { id: '61948', title: 'Mittelniederdeutsches Handwörterbuch (German)', author: 'August Lübben' },
  { id: '3208', title: 'Mr. Honey\'s Medium Business Dictionary (German-English) (German)', author: 'Winfried Honig' },
  { id: '3212', title: 'Mr. Honey\'s Beginner\'s Dictionary (German-English) (German)', author: 'Winfried Honig' },
  { id: '19460', title: 'Handbuch der deutschen Kunstdenkmäler, Bd.1, Mitteldeutschland, 1914 (German)', author: 'Georg Dehio' },
  { id: '75007', title: 'Vollständiges Orthographisches Wörterbuch der deutschen Sprache :  mit etymologischen Angaben, kurzen Sacherklärungen und Verdeutschungen der Fremdwörter (German)', author: 'Konrad Duden' },
  { id: '3298', title: 'Mr. Honey\'s Banking Dictionary (German-English) (German)', author: 'Winfried Honig' },
  { id: '58782', title: 'Neues Spanisch-Deutsches Wörterbuch (German)', author: 'Theodor Stromer' },
  { id: '49503', title: 'Ährenlese: A German Reader with Practical Exercises (German)', author: '' },
  { id: '6343', title: 'Kritik der reinen Vernunft (German)', author: 'Immanuel Kant' },
  { id: '22160', title: 'Studien und Plaudereien. First Series (German)', author: 'Sigmon M. Stern' },
  { id: '22492', title: 'Reise in die Aequinoctial-Gegenden des neuen Continents. Band 1. (German)', author: 'Alexander von Humboldt' },
];

const spanishCollection = [
  { id: '2000', title: 'Don Quijote (Spanish)', author: 'Miguel de Cervantes Saavedra' },
  { id: '67961', title: 'El arte de amar (Spanish)', author: 'Ovid' },
  { id: '58221', title: 'La Odisea (Spanish)', author: 'Homer' },
  { id: '21144', title: 'Las Fábulas de Esopo, Vol. 03 (Spanish)', author: 'Aesop and George Fyler Townsend' },
  { id: '39647', title: 'Heath\'s Modern Language Series: The Spanish American Reader (Spanish)', author: 'Ernesto Nelson' },
  { id: '20029', title: 'Las Fábulas de Esopo, Vol. 02 (Spanish)', author: 'Aesop and George Fyler Townsend' },
  { id: '36805', title: 'Spanish Tales for Beginners (Spanish)', author: '' },
  { id: '21143', title: 'Las Fábulas de Esopo, Vol. 01 (Spanish)', author: 'Aesop and George Fyler Townsend' },
  { id: '16059', title: 'Modern Spanish Lyrics (Spanish)', author: '' },
  { id: '61851', title: 'El crimen y el castigo (Spanish)', author: 'Fyodor Dostoyevsky' },
  { id: '15725', title: 'Doña Perfecta (Spanish)', author: 'Benito Pérez Galdós' },
  { id: '69552', title: 'El libro de las tierras vírgenes (Spanish)', author: 'Rudyard Kipling' },
  { id: '73257', title: 'Historia de la lengua y literatura castellana, Tomo 2 :  Época de Carlos V (Spanish)', author: 'Julio Cejador y Frauca' },
  { id: '49836', title: 'Niebla (Nivola) (Spanish)', author: 'Miguel de Unamuno' },
  { id: '73255', title: 'Historia de la lengua y literatura castellana, Tomo 1 :  Desde los orígenes hasta Carlos V (Spanish)', author: 'Julio Cejador y Frauca' },
  { id: '60464', title: 'El árbol de la ciencia: novela (Spanish)', author: 'Pío Baroja' },
];

const italianCollection = [
  { id: '48776', title: 'Petrarch, the First Modern Scholar and Man of Letters', author: 'Francesco Petrarca' },
  { id: '41537', title: 'The Divine Comedy of Dante Alighieri: The Inferno', author: 'Dante Alighieri' },
  { id: '57303', title: 'La Divina Comedia (Spanish)', author: 'Dante Alighieri' },
  { id: '50306', title: 'Rinaldo ardito: Frammenti inediti pubblicati sul manoscritto originale (Italian)', author: 'Lodovico Ariosto' },
  { id: '1012', title: 'La Divina Commedia di Dante (Italian)', author: 'Dante Alighieri' },
  { id: '997', title: 'Divina Commedia di Dante: Inferno (Italian)', author: 'Dante Alighieri' },
  { id: '38578', title: 'Fame usurpate (Italian)', author: 'Vittorio Imbriani' },
  { id: '48943', title: "L'isola dei baci: Romanzo erotico-sociale (Italian)", author: 'F. T. Marinetti and Bruno Corra' },
  { id: '18459', title: 'Hypnerotomachia: The Strife of Loue in a Dreame', author: 'Francesco Colonna' },
  { id: '36448', title: 'Renaissance in Italy, Volume 5 (of 7)', author: 'John Addington Symonds' },
  { id: '35792', title: 'Renaissance in Italy, Volume 4 (of 7)', author: 'John Addington Symonds' },
  { id: '28961', title: "Cuore (Heart): An Italian Schoolboy's Journal", author: 'Edmondo De Amicis' },
  { id: '17650', title: 'The Sonnets, Triumphs, and Other Poems of Petrarch', author: 'Francesco Petrarca' },
];

const poetryCollection = [
  { id: '3011', title: 'The Lady of the Lake', author: 'Walter Scott' },
  { id: '24571', title: 'Der Struwwelpeter (German)', author: 'Heinrich Hoffmann' },
  { id: '6130', title: 'The Iliad', author: 'Homer' },
  { id: '16328', title: 'Beowulf: An Anglo-Saxon Epic Poem', author: '' },
  { id: '2147', title: 'The Works of Edgar Allan Poe — Volume 1', author: 'Edgar Allan Poe' },
  { id: '26471', title: 'Spoon River Anthology', author: 'Edgar Lee Masters' },
  { id: '61521', title: 'The Modern Traveller', author: 'Hilaire Belloc' },
  { id: '1727', title: 'The Odyssey', author: 'Homer' },
  { id: '14591', title: 'Faust [part 1]. Translated Into English in the Original Metres', author: 'Johann Wolfgang von Goethe' },
  { id: '2199', title: 'The Iliad', author: 'Homer' },
  { id: '56712', title: 'The Comic Poems of Thomas Hood', author: 'Thomas Hood' },
  { id: '6122', title: 'Tobogganing on Parnassus', author: 'Franklin P. Adams' },
  { id: '17161', title: 'Max und Moritz: Eine Bubengeschichte in sieben Streichen (German)', author: 'Wilhelm Busch' },
  { id: '31036', title: 'The Lovers Assistant; Or, New Art of Love', author: 'Henry Fielding and Ovid' },
  { id: '21700', title: 'Don Juan', author: 'Baron George Gordon Byron Byron' },
  { id: '24869', title: 'The Rámáyan of Válmíki, translated into English verse', author: 'Valmiki' },
  { id: '12116', title: 'Struwwelpeter: Merry Stories and Funny Pictures', author: 'Heinrich Hoffmann' },
  { id: '15272', title: "Spenser's The Faerie Queene, Book I", author: 'Edmund Spenser' },
  { id: '12242', title: 'Poems by Emily Dickinson, Three Series, Complete', author: 'Emily Dickinson' },
  { id: '5131', title: "Childe Harold's Pilgrimage", author: 'Baron George Gordon Byron Byron' },
  { id: '1934', title: 'Songs of Innocence and of Experience', author: 'William Blake' },
  { id: '1322', title: 'Leaves of Grass', author: 'Walt Whitman' },
];

// Function to test a URL
function testUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, { timeout: 10000 }, (res) => {
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
async function testBook(book, collectionName) {
  const urls = [];
  
  if (book.directUrl) {
    urls.push({ url: book.directUrl, type: 'direct' });
  } else {
    urls.push({ url: `https://www.gutenberg.org/files/${book.id}/${book.id}-0.txt`, type: 'files' });
    urls.push({ url: `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.txt`, type: 'cache' });
  }
  
  for (const urlInfo of urls) {
    const result = await testUrl(urlInfo.url);
    if (result.success) {
      return { success: true, workingUrl: urlInfo.url, type: urlInfo.type };
    }
  }
  
  return { success: false, book, collectionName };
}

// Main testing function
async function testAllBooks() {
  const collections = [
    { name: 'Top 100', books: top100 },
    { name: 'Shakespeare', books: shakespeareWorks },
    { name: 'French', books: frenchCollection },
    { name: 'German', books: germanCollection },
    { name: 'Spanish', books: spanishCollection },
    { name: 'Italian', books: italianCollection },
    { name: 'Poetry', books: poetryCollection },
  ];
  
  const results = {
    working: [],
    failing: []
  };
  
  console.log('Testing all book URLs...\n');
  
  for (const collection of collections) {
    console.log(`Testing ${collection.name} collection (${collection.books.length} books)...`);
    
    for (const book of collection.books) {
      const result = await testBook(book, collection.name);
      if (result.success) {
        results.working.push({
          ...book,
          collection: collection.name,
          workingUrl: result.workingUrl,
          type: result.type
        });
      } else {
        results.failing.push({
          ...book,
          collection: collection.name
        });
      }
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
testAllBooks().catch(console.error); 