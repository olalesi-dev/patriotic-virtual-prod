import { appointmentTopics } from './topics/appointments';
import { billingTopics } from './topics/billing';
import { clinicalTopics } from './topics/clinical';
import { communicationTopics } from './topics/communications';
import { workspaceTopics } from './topics/workspace';
import {
  notificationTopics,
  type NotificationTopicDefinition,
  type NotificationTopicKey,
} from './types';

export const notificationRegistry: Record<
  NotificationTopicKey,
  NotificationTopicDefinition
> = {
  ...workspaceTopics,
  ...appointmentTopics,
  ...communicationTopics,
  ...billingTopics,
  ...clinicalTopics,
} as Record<NotificationTopicKey, NotificationTopicDefinition>;

export const getNotificationTopic = (
  topicKey: NotificationTopicKey,
): NotificationTopicDefinition => notificationRegistry[topicKey];

export const listNotificationTopics = (): NotificationTopicDefinition[] =>
  notificationTopics.map((topicKey) => notificationRegistry[topicKey]);
