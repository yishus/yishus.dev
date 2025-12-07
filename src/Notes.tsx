import Article from "./Article";

interface NotesProps {
  markdownContent: string[];
}

const Notes = (props: NotesProps) => {
  const { markdownContent } = props;
  return (
    <>
      {markdownContent.map((content: string, index: number) => (
        <Article key={index} markdownContent={content} />
      ))}
    </>
  );
};

export default Notes;
