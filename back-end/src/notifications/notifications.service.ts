import { Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export type AppNotification = {
  id: string;
  userId: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
};

const NOTIFICATIONS_FILE = join(__dirname, '..', '..', 'data', 'notifications.json');

@Injectable()
export class NotificationsService {
  private notifications: AppNotification[] = [];

  constructor() {
    this.loadPersistedNotifications();
  }

  createNotification(userId: string, message: string, type: NotificationType = 'info'): AppNotification {
    const notif: AppNotification = {
      id: `NOTIF${Date.now()}${Math.floor(Math.random() * 1000)}`,
      userId,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString(),
    };
    
    this.notifications.push(notif);
    this.persistNotifications();
    return notif;
  }

  getNotificationsForUser(userId: string): AppNotification[] {
    return this.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  markAsRead(id: string): AppNotification {
    const notif = this.notifications.find((n) => n.id === id);
    if (!notif) {
      throw new NotFoundException('Notification not found');
    }
    notif.read = true;
    this.persistNotifications();
    return notif;
  }

  clearAllForUser(userId: string): void {
    this.notifications = this.notifications.filter((n) => n.userId !== userId);
    this.persistNotifications();
  }

  private loadPersistedNotifications() {
    try {
      if (!existsSync(NOTIFICATIONS_FILE)) return;
      const data = JSON.parse(readFileSync(NOTIFICATIONS_FILE, 'utf8'));
      if (Array.isArray(data)) this.notifications = data;
    } catch (_) {}
  }

  private persistNotifications() {
    mkdirSync(dirname(NOTIFICATIONS_FILE), { recursive: true });
    writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(this.notifications, null, 2));
  }
}
