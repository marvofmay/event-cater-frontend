import Notification from "../types/Notification";

const notifications: Notification[] = [
  {
    uuid: "1",
    receivedAt: new Date().toISOString(),
    readAt: null,
    message: {
      uuid: "message-1",
      title: "New task",
      content: "New task...",
      channelCode: "intenal",
    },
  },
  {
    uuid: "2",
    receivedAt: new Date().toISOString(),
    readAt: new Date().toISOString(),
    message: {
      uuid: "message-2",
      title: "Task",
      content: "Task...",
      channelCode: "intenal",
    },
  },
];

export default notifications;
