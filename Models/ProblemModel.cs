using System.ComponentModel.DataAnnotations.Schema;
using MessagePack;
using Newtonsoft.Json;

namespace CryptoBotUI.Models
{
    [MessagePackObject]
    public class ProblemModel
    {
        [JsonIgnore]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [JsonIgnore]
        public FileNodeModel FileNode { get; set; }

        [JsonIgnore]
        public int? FileNodeId { get; set; }

        [Key("message")]
        public string Message { get; set; }
        
        [Key("startLineNumber")]
        public int StartLineNumber { get; set; }
        
        [Key("startColumn")]
        public int StartColumn { get; set; }
    }
}