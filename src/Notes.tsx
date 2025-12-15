import Article from "./Article";

interface NotesProps {
  date: string;
  markdownContent: string[];
}

const Notes = (props: NotesProps) => {
  const { date, markdownContent } = props;
  const title = new Date(date).toLocaleString("default", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <>
      <h2 id={date}>
        {title}{" "}
        <a href={`#${date}`} aria-label="Permalink to this heading">
          ¶
        </a>
      </h2>
      {markdownContent.map((content: string, index: number) => (
        <Article key={index} markdownContent={content} />
      ))}
    </>
  );
};

export default Notes;
