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

export {
  CommandPayload,
  CheckinType
}