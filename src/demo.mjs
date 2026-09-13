const pride = `<h2>Chapter I</h2><p>It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.</p><p>However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered as the rightful property of some one or other of their daughters.</p><p>“My dear Mr. Bennet,” said his lady to him one day, “have you heard that Netherfield Park is let at last?”</p><p>Mr. Bennet replied that he had not.</p><p>“But it is,” returned she; “for Mrs. Long has just been here, and she told me all about it.”</p><p>Mr. Bennet made no answer.</p><p>“Do not you want to know who has taken it?” cried his wife impatiently.</p><p>“You want to tell me, and I have no objection to hearing it.”</p><p>This was invitation enough.</p><p>“Why, my dear, you must know, Mrs. Long says that Netherfield is taken by a young man of large fortune from the north of England; that he came down on Monday in a chaise and four to see the place, and was so much delighted with it that he agreed with Mr. Morris immediately; that he is to take possession before Michaelmas, and some of his servants are to be in the house by the end of next week.”</p><p>“What is his name?”</p><p>“Bingley.”</p><p>“Is he married or single?”</p><p>“Oh! Single, my dear, to be sure! A single man of large fortune; four or five thousand a year. What a fine thing for our girls!”</p><p>“How so? How can it affect them?”</p><p>“My dear Mr. Bennet,” replied his wife, “how can you be so tiresome! You must know that I am thinking of his marrying one of them.”</p><p>“Is that his design in settling here?”</p><p>“Design! Nonsense, how can you talk so! But it is very likely that he may fall in love with one of them, and therefore you must visit him as soon as he comes.”</p>`;
const garden = `<h2>Chapter I · There is no one left</h2><p>When Mary Lennox was sent to Misselthwaite Manor to live with her uncle everybody said she was the most disagreeable-looking child ever seen. It was true, too. She had a little thin face and a little thin body, thin light hair and a sour expression. Her hair was yellow, and her face was yellow because she had been born in India and had always been ill in one way or another.</p><p>Her father had held a position under the English Government and had always been busy and ill himself, and her mother had been a great beauty who cared only to go to parties and amuse herself with gay people.</p><p>She had not wanted a little girl at all, and when Mary was born she handed her over to the care of an Ayah, who was made to understand that if she wished to please the Mem Sahib she must keep the child out of sight as much as possible.</p><p>So when she was a sickly, fretful, ugly little baby she was kept out of the way, and when she became a sickly, fretful, toddling thing she was kept out of the way also. She never remembered seeing familiarly anything but the dark faces of her Ayah and the other native servants, and as they always obeyed her and gave her her own way in everything, because the Mem Sahib would be angry if she was disturbed by her crying, by the time she was six years old she was as tyrannical and selfish a little pig as ever lived.</p><p>The young English governess who came to teach her to read and write disliked her so much that she gave up her place in three months, and when other governesses came to try to fill it they always went away in a shorter time than the first one.</p>`;
const reading = `<h2>Start with the assignment</h2><p>Before reading, check what you need to do with the text. A class discussion, an essay, and an exam may call for different notes.</p><h3>Choose what to highlight</h3><p>Look for the main claim, key definitions, and evidence that supports or challenges the argument. Add a note explaining why a passage matters rather than highlighting every sentence.</p><p>Write a short explanation in your own words beside each important passage.</p><h3>Keep track of questions</h3><p>If a claim is unclear, note what you need to check. Label it Discussion or Review so you can find it before class.</p><h3>Organize notes for later</h3><p>Use a folder for each course or assignment. Labels such as Key terms and Essay evidence help you find related notes across different readings.</p><p>Try selecting the sentence above, choosing a tool, and saving an annotation. Your notes stay on this device; export a backup in Settings before switching computers.</p>`;
export function demoLibrary() {
  const createdAt = new Date().toISOString();
  const documents = [
    {
      id: "sample-pride",
      title: "Pride and Prejudice",
      author: "Jane Austen",
      format: "EPUB",
      theme: "rose",
      html: pride,
      sample: true,
      subtitle: "Sample chapter",
      createdAt,
      lastOpened: createdAt,
      url: "https://www.gutenberg.org/ebooks/1342",
    },
    {
      id: "sample-garden",
      title: "The Secret Garden",
      author: "Frances Hodgson Burnett",
      format: "EPUB",
      theme: "sage",
      html: garden,
      sample: true,
      subtitle: "Sample chapter",
      createdAt,
    },
    {
      id: "sample-reading",
      title: "Taking useful reading notes",
      author: "Marginalia guide",
      format: "Article",
      theme: "lavender",
      html: reading,
      sample: true,
      subtitle: "Sample annotation guide",
      createdAt,
    },
  ];
  const make = (id, doc, type, quote, note, labels, color) => {
    const el = document.createElement("div");
    el.innerHTML = doc.html;
    const text = el.textContent,
      start = text.indexOf(quote);
    return {
      id,
      documentId: doc.id,
      documentTitle: doc.title,
      type,
      quote,
      note,
      labels,
      color,
      createdAt,
      page: 1,
      anchor: {
        start,
        end: start + quote.length,
        exact: quote,
        prefix: text.slice(Math.max(0, start - 40), start),
        suffix: text.slice(start + quote.length, start + quote.length + 40),
      },
    };
  };
  return {
    documents,
    annotations: [
      make(
        "sample-a1",
        documents[0],
        "highlight",
        "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.",
        "An opening that tells us as much about society as it does about marriage.",
        ["Essay evidence", "Review"],
        "#f2dfa0",
      ),
      make(
        "sample-a2",
        documents[2],
        "margin",
        "Write a short explanation in your own words beside each important passage.",
        "For class: explain how the evidence supports the author's main claim.",
        ["Review"],
        "#dbd1eb",
      ),
      make(
        "sample-a3",
        documents[1],
        "underline",
        "When Mary Lennox was sent to Misselthwaite Manor to live with her uncle everybody said she was the most disagreeable-looking child ever seen.",
        "",
        ["Characters"],
        "#cbdcc4",
      ),
    ],
  };
}
