using MessagePack;

namespace CryptoBotUI.Models
{
    [MessagePackObject]
    public class UpdateFileModel
    {
        [Key("fileName")]
        public string FileName { get; set; }

        [Key("content")]
        public string Content { get; set; }

        [Key("problems")]
        public ProblemModel[] Problems { get; set; }
    }
}