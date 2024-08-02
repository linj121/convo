type CommandPayload = {
  messageTime: number,
  talkerId: string,
  talkerName: string,
  talkerAlias: string | undefined,
  checkinType: CheckinType,
  url: string | undefined,
  note: string | undefined
};

enum CheckinType {
  Leetcode = "leetcode",
  Workout = "workout",
  Reading = "reading",
  Cooking = "cooking",
}

/**
 * Wechaty Puppet Unified Schema for Message
 */
enum MessageType {
  Unknown = 0,

  Attachment  = 1,    // Attach(6),
  Audio       = 2,    // Audio(1), Voice(34)
  Contact     = 3,    // ShareCard(42)
  ChatHistory = 4,    // ChatHistory(19)
  Emoticon    = 5,    // Sticker: Emoticon(15), Emoticon(47)
  Image       = 6,    // Img(2), Image(3)
  Text        = 7,    // Text(1)
  Location    = 8,    // Location(48)
  MiniProgram = 9,    // MiniProgram(33)
  GroupNote   = 10,   // GroupNote(53)
  Transfer    = 11,   // Transfers(2000)
  RedEnvelope = 12,   // RedEnvelopes(2001)
  Recalled    = 13,   // Recalled(10002)
  Url         = 14,   // Url(5)
  Video       = 15,   // Video(4), Video(43)
  Post        = 16,   // Moment, Channel, Tweet, etc
}

export {
  CommandPayload,
  CheckinType,
  MessageType
}
