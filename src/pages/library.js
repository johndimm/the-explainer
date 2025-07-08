import { useRouter } from 'next/router';
import { useState } from 'react';

// Project Gutenberg Top 100 (full list)
const top100 = [
  { id: '1342', title: 'Pride and Prejudice by Jane Austen' },
  { id: '84', title: 'Frankenstein; Or, The Modern Prometheus by Mary Wollstonecraft Shelley' },
  { id: '11', title: 'Alice’s Adventures in Wonderland by Lewis Carroll' },
  { id: '1661', title: 'The Adventures of Sherlock Holmes by Arthur Conan Doyle' },
  { id: '2701', title: 'Moby Dick; Or, The Whale by Herman Melville' },
  { id: '98', title: 'A Tale of Two Cities by Charles Dickens' },
  { id: '74', title: 'The Adventures of Tom Sawyer by Mark Twain' },
  { id: '345', title: 'Dracula by Bram Stoker' },
  { id: '1952', title: 'The Yellow Wallpaper by Charlotte Perkins Gilman' },
  { id: '2542', title: 'A Doll’s House by Henrik Ibsen' },
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
  { id: '74', title: 'The Adventures of Tom Sawyer by Mark Twain' },
  { id: '25305', title: 'The Scarlet Letter by Nathaniel Hawthorne' },
  { id: '1260', title: 'Jane Eyre by Charlotte Brontë' },
  { id: '345', title: 'Dracula by Bram Stoker' },
  { id: '74', title: 'The Adventures of Tom Sawyer by Mark Twain' },
  { id: '98', title: 'A Tale of Two Cities by Charles Dickens' },
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
  { id: '1543', title: 'A Lover’s Complaint' },
  { id: '1514', title: 'A Midsummer Night’s Dream' },
  { id: '1529', title: 'All’s Well That Ends Well' },
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
  { id: '1510', title: 'Love’s Labour’s Lost' },
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
  { id: '1539', title: 'The Winter’s Tale' },
  { id: '1536', title: 'Timon of Athens' },
  { id: '1528', title: 'Troilus and Cressida' },
  { id: '1526', title: 'Twelfth Night' },
  { id: '1527', title: 'Twelfth Night' },
  { id: '1509', title: 'Two Gentlemen of Verona' },
  { id: '1045', title: 'Venus and Adonis' },
];

// French collection from Project Gutenberg (parsed from french.txt)
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

// German collection from Project Gutenberg (parsed from german.txt)
const germanCollection = [
  { id: '2981', title: 'The Memoirs of Jacques Casanova de Seingalt, 1725-1798. Complete', author: 'Giacomo Casanova' },
  { id: '7524', title: 'The Germany and the Agricola of Tacitus', author: 'Cornelius Tacitus' },
  { id: '21053', title: 'An anthology of German literature (German)', author: 'Calvin Thomas' },
  { id: '2995', title: 'Tacitus on Germany', author: 'Cornelius Tacitus' },
  { id: '7959', title: 'The Reign of Tiberius, Out of the First Six Annals of Tacitus;', author: 'Cornelius Tacitus' },
  { id: '12400', title: 'Bismarck and the Foundation of the German Empire', author: 'James Wycliffe Headlam' },
  { id: '20595', title: 'The Awful German Language', author: 'Mark Twain' },
  { id: '8401', title: 'Germany from the Earliest Period, Volume 4', author: 'Wolfgang Menzel' },
  { id: '19036', title: 'Germany and the Germans from an American Point of View', author: 'Price Collier' },
  { id: '16224', title: 'A Bibliographical, Antiquarian and Picturesque Tour in France and Germany, Volume One', author: 'Thomas Frognall Dibdin' },
  { id: '17107', title: 'A Bibliographical, Antiquarian and Picturesque Tour in France and Germany, Volume Two', author: 'Thomas Frognall Dibdin' },
  { id: '9090', title: 'Germania and Agricola (Latin)', author: 'Cornelius Tacitus' },
  { id: '17461', title: 'The Great German Composers', author: 'George T. Ferris' },
  { id: '19946', title: 'Villa Elsa', author: 'Stuart Oliver Henry' },
  { id: '17364', title: 'Types of Weltschmerz in German Poetry', author: 'Wilhelm Alfred Braun' },
  { id: '1472', title: 'In a German Pension', author: 'Katherine Mansfield' },
  { id: '12060', title: 'The German Classics of the Nineteenth and Twentieth Centuries, Volume 04', author: '' },
  { id: '17624', title: 'A Bibliographical, Antiquarian and Picturesque Tour in France and Germany, Volume Three', author: 'Thomas Frognall Dibdin' },
  { id: '16587', title: 'Historic Tales: The Romance of Reality. Vol. 05 (of 15), German', author: 'Charles Morris' },
  { id: '2071', title: 'Stories by English Authors: Germany (Selected by Scribners)', author: '' },
  { id: '10166', title: 'What Germany Thinks; Or, The War as Germans see it', author: 'Thomas F. A. Smith' },
  { id: '14460', title: 'Faust: a Tragedy [part 1], Translated from the German of Goethe', author: 'Johann Wolfgang von Goethe' },
  { id: '17928', title: 'The Influence of India and Persia on the Poetry of Germany', author: 'Arthur F. J. Remy' },
  { id: '16445', title: 'Observations and Reflections Made in the Course of a Journey through France, Italy, and Germany, Vol. 1 (of 2)', author: 'Hester Lynch Piozzi' },
  { id: '13377', title: 'A tour through some parts of France, Switzerland, Savoy, Germany and Belgium, during the summer and autumn of 1814', author: 'Richard Boyle Bernard' },
];

// Spanish collection from Project Gutenberg (parsed from spanish.txt)
const spanishCollection = [
  { id: '10676', title: 'The Reign of Greed', author: 'José Rizal' },
  { id: '2000', title: 'Don Quijote (Spanish)', author: 'Miguel de Cervantes Saavedra' },
  { id: '5921', title: 'The History of Don Quixote, Volume 1, Complete', author: 'Miguel de Cervantes Saavedra' },
  { id: '67961', title: 'El arte de amar (Spanish)', author: 'Ovid' },
  { id: '58221', title: 'La Odisea (Spanish)', author: 'Homer' },
  { id: '21144', title: 'Las Fábulas de Esopo, Vol. 03 (Spanish)', author: 'Aesop and George Fyler Townsend' },
  { id: '39647', title: 'Heath\'s Modern Language Series: The Spanish American Reader (Spanish)', author: 'Ernesto Nelson' },
  { id: '20029', title: 'Las Fábulas de Esopo, Vol. 02 (Spanish)', author: 'Aesop and George Fyler Townsend' },
  { id: '36805', title: 'Spanish Tales for Beginners (Spanish)', author: '' },
  { id: '21143', title: 'Las Fábulas de Esopo, Vol. 01 (Spanish)', author: 'Aesop and George Fyler Townsend' },
  { id: '28842', title: 'Don Quixote, Volume 1', author: 'Miguel de Cervantes Saavedra' },
  { id: '16059', title: 'Modern Spanish Lyrics (Spanish)', author: '' },
  { id: '5946', title: 'The History of Don Quixote, Volume 2, Complete', author: 'Miguel de Cervantes Saavedra' },
  { id: '47629', title: 'Ang "Filibusterismo" (Karugtóng ng Noli Me Tangere) (Tagalog)', author: 'José Rizal' },
  { id: '61851', title: 'El crimen y el castigo (Spanish)', author: 'Fyodor Dostoyevsky' },
  { id: '15725', title: 'Doña Perfecta (Spanish)', author: 'Benito Pérez Galdós' },
  { id: '69552', title: 'El libro de las tierras vírgenes (Spanish)', author: 'Rudyard Kipling' },
  { id: '51090', title: 'A Polyglot of Foreign Proverbs', author: '' },
  { id: '73257', title: 'Historia de la lengua y literatura castellana, Tomo 2 :  Época de Carlos V (Spanish)', author: 'Julio Cejador y Frauca' },
  { id: '49836', title: 'Niebla (Nivola) (Spanish)', author: 'Miguel de Unamuno' },
  { id: '50352', title: 'Spanish Papers', author: 'Washington Irving' },
  { id: '73255', title: 'Historia de la lengua y literatura castellana, Tomo 1 :  Desde los orígenes hasta Carlos V (Spanish)', author: 'Julio Cejador y Frauca' },
  { id: '53489', title: 'The Life of Lazarillo de Tormes', author: 'Anonymous' },
  { id: '55829', title: 'History of Spanish and Portuguese Literature (Vol 1 of 2)', author: 'Friedrich Bouterwek' },
  { id: '60464', title: 'El árbol de la ciencia: novela (Spanish)', author: 'Pío Baroja' },
];

// Italian collection from Project Gutenberg (parsed from italian.txt)
const italianCollection = [
  { id: '8800', title: 'The divine comedy', author: 'Dante Alighieri' },
  { id: '3618', title: 'Arms and the Man', author: 'Bernard Shaw' },
  { id: '1001', title: "Divine Comedy, Longfellow's Translation, Hell", author: 'Dante Alighieri' },
  { id: '48776', title: 'Petrarch, the First Modern Scholar and Man of Letters', author: 'Francesco Petrarca' },
  { id: '41537', title: 'The Divine Comedy of Dante Alighieri: The Inferno', author: 'Dante Alighieri' },
  { id: '57303', title: 'La Divina Comedia (Spanish)', author: 'Dante Alighieri' },
  { id: '50306', title: 'Rinaldo ardito: Frammenti inediti pubblicati sul manoscritto originale (Italian)', author: 'Lodovico Ariosto' },
  { id: '61262', title: 'Poirot Investigates', author: 'Agatha Christie' },
  { id: '50307', title: 'Fifteen sonnets of Petrarch', author: 'Francesco Petrarca' },
  { id: '1012', title: 'La Divina Commedia di Dante (Italian)', author: 'Dante Alighieri' },
  { id: '1004', title: "Divine Comedy, Longfellow's Translation, Complete", author: 'Dante Alighieri' },
  { id: '8795', title: 'The Divine Comedy by Dante, Illustrated, Purgatory, Complete', author: 'Dante Alighieri' },
  { id: '41085', title: 'The New Life (La Vita Nuova)', author: 'Dante Alighieri' },
  { id: '997', title: 'Divina Commedia di Dante: Inferno (Italian)', author: 'Dante Alighieri' },
  { id: '8799', title: 'The Divine Comedy by Dante, Illustrated, Paradise, Complete', author: 'Dante Alighieri' },
  { id: '8789', title: 'The vision of hell.', author: 'Dante Alighieri' },
  { id: '38578', title: 'Fame usurpate (Italian)', author: 'Vittorio Imbriani' },
  { id: '48943', title: "L'isola dei baci: Romanzo erotico-sociale (Italian)", author: 'F. T. Marinetti and Bruno Corra' },
  { id: '142', title: 'The $30,000 Bequest, and Other Stories', author: 'Mark Twain' },
  { id: '18459', title: 'Hypnerotomachia: The Strife of Loue in a Dreame', author: 'Francesco Colonna' },
  { id: '36448', title: 'Renaissance in Italy, Volume 5 (of 7)', author: 'John Addington Symonds' },
  { id: '35792', title: 'Renaissance in Italy, Volume 4 (of 7)', author: 'John Addington Symonds' },
  { id: '28961', title: "Cuore (Heart): An Italian Schoolboy's Journal", author: 'Edmondo De Amicis' },
  { id: '17650', title: 'The Sonnets, Triumphs, and Other Poems of Petrarch', author: 'Francesco Petrarca' },
  { id: '4253', title: 'Dramatic Romances', author: 'Robert Browning' },
];

// Poetry collection from Project Gutenberg (parsed from poetry.txt)
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
    title: 'French Collection',
    items: frenchCollection,
    onClickItem: 'handleReadFrench',
    itemKey: 'id',
  },
  {
    key: 'german',
    title: 'German Collection',
    items: germanCollection,
    onClickItem: 'handleReadGerman',
    itemKey: 'id',
  },
  {
    key: 'spanish',
    title: 'Spanish Collection',
    items: spanishCollection,
    onClickItem: 'handleReadSpanish',
    itemKey: 'id',
  },
  {
    key: 'italian',
    title: 'Italian Collection',
    items: italianCollection,
    onClickItem: 'handleReadItalian',
    itemKey: 'id',
  },
  {
    key: 'poetry',
    title: 'Poetry Collection',
    items: poetryCollection,
    onClickItem: 'handleReadPoetry',
    itemKey: 'id',
  },
];

// Assign an emoji/icon and accent color to each collection
const collectionMeta = {
  shakespeare: { emoji: '🎭', color: '#f3e8ff' },
  top100: { emoji: '📚', color: '#e0f2fe' },
  french: { emoji: '🇫🇷', color: '#fef9c3' },
  german: { emoji: '🇩🇪', color: '#fce7f3' },
  spanish: { emoji: '🇪🇸', color: '#f1f5f9' },
  italian: { emoji: '🇮🇹', color: '#e0fce7' },
  poetry: { emoji: '📝', color: '#fff7ed' },
};

export default function Library() {
  const router = useRouter();
  const [loadingShakespeare, setLoadingShakespeare] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [loadingFrench, setLoadingFrench] = useState(null);
  const [loadingGerman, setLoadingGerman] = useState(null);
  const [loadingSpanish, setLoadingSpanish] = useState(null);
  const [loadingItalian, setLoadingItalian] = useState(null);
  const [loadingPoetry, setLoadingPoetry] = useState(null);
  const [expanded, setExpanded] = useState({});

  // Handlers for each collection
  const handleReadGutenberg = async (book) => {
    setLoadingId(book.id);
    const gutenbergUrl = `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.txt`;
    const apiUrl = `/api/fetch-gutenberg?url=${encodeURIComponent(gutenbergUrl)}`;
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error('Failed to fetch book text');
      const text = await res.text();
      localStorage.setItem('explainer:bookText', text);
      localStorage.setItem('explainer:bookTitle', book.title);
      router.push('/');
    } catch (err) {
      alert('Could not load book text.');
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
      router.push('/');
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
      router.push('/');
    } catch (err) {
      alert('Could not load this work.');
    } finally {
      setLoadingFrench(null);
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
      router.push('/');
    } catch (err) {
      alert('Could not load this work.');
    } finally {
      setLoadingGerman(null);
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
      router.push('/');
    } catch (err) {
      alert('Could not load this work.');
    } finally {
      setLoadingSpanish(null);
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
      router.push('/');
    } catch (err) {
      alert('Could not load this work.');
    } finally {
      setLoadingItalian(null);
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
      router.push('/');
    } catch (err) {
      alert('Could not load this work.');
    } finally {
      setLoadingPoetry(null);
    }
  };

  // Map collection key to handler and loading state
  const handlerMap = {
    shakespeare: handleReadShakespeare,
    top100: handleReadGutenberg,
    french: handleReadFrench,
    german: handleReadGerman,
    spanish: handleReadSpanish,
    italian: handleReadItalian,
    poetry: handleReadPoetry,
  };
  const loadingMap = {
    shakespeare: loadingShakespeare,
    top100: loadingId,
    french: loadingFrench,
    german: loadingGerman,
    spanish: loadingSpanish,
    italian: loadingItalian,
    poetry: loadingPoetry,
  };

  // Responsive grid: 2 columns desktop, 1 column mobile
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 32,
    marginTop: 24,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 0 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 16px 64px 16px' }}>
        <h1 style={{ fontSize: 38, fontWeight: 800, marginBottom: 8, letterSpacing: -1, color: '#1e293b' }}>Library</h1>
        <p style={{ color: '#64748b', fontSize: 18, marginBottom: 32 }}>
          Explore classic literature in many languages. Click a book to start reading!
        </p>
        <div style={gridStyle}>
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
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 320,
                  border: '1px solid #e5e7eb',
                }}
              >
                {/* Accent bar */}
                <div style={{
                  background: meta.color || '#f3f4f6',
                  height: 10,
                  width: '100%',
                }} />
                <div style={{ padding: '24px 24px 16px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 28, marginRight: 10 }}>{meta.emoji}</span>
                    <h2
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        margin: 0,
                        color: '#334155',
                        cursor: 'pointer',
                        flex: 1,
                        letterSpacing: -0.5,
                        transition: 'color 0.2s',
                      }}
                      onClick={() => setExpanded((prev) => ({ ...prev, [col.key]: !prev[col.key] }))}
                      tabIndex={0}
                    >
                      {col.title} {col.items.length > 5 && (
                        <span style={{ fontSize: 15, fontWeight: 400, color: '#2563eb', marginLeft: 8 }}>
                          {expanded[col.key] ? '(Show Less)' : '(More...)'}
                        </span>
                      )}
                    </h2>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', marginTop: 4 }}>
                    {(expanded[col.key] ? col.items : col.items.slice(0, 5)).map((item, i) => (
                      <div
                        key={`${item[col.itemKey]}-${i}`}
                        style={{
                          padding: '10px 0',
                          borderBottom: i !== (expanded[col.key] ? col.items.length - 1 : Math.min(4, col.items.length - 1)) ? '1px solid #f1f5f9' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <span
                          onClick={() => handlerMap[col.key](item)}
                          style={{
                            color: '#3b82f6',
                            cursor: loadingMap[col.key] === item[col.itemKey] ? 'wait' : 'pointer',
                            textDecoration: 'underline',
                            fontWeight: 500,
                            fontSize: 17,
                            opacity: loadingMap[col.key] === item[col.itemKey] ? 0.6 : 1,
                            transition: 'color 0.2s',
                          }}
                          onMouseOver={e => e.target.style.color = '#1d4ed8'}
                          onMouseOut={e => e.target.style.color = '#3b82f6'}
                        >
                          {loadingMap[col.key] === item[col.itemKey]
                            ? 'Loading...'
                            : `${item.title}${item.author ? ' by ' + item.author : ''}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 