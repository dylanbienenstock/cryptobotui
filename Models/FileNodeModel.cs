using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using MessagePack;
using Newtonsoft.Json;

namespace CryptoBotUI.Models
{
    [MessagePackObject]
    public class FileNodeModel
    {
        [JsonIgnore]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [JsonIgnore]
        public int? ParentId { get; set; }
        
        [JsonIgnore]
        public DirectoryNodeModel Parent { get; set; }

        [JsonIgnore]
        public bool Locked { get; set; }
        
        [Key("name")]
        public string Name { get; set; }
        
        [Key("content")]
        public string Content { get; set; }

        [Key("problems")]
        public List<ProblemModel> Problems { get; set; }
    }
}