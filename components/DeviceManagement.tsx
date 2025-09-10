"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { getRegisteredDevices, removeDevice } from '@/lib/auth/session';
import { DeviceInfo } from '@/lib/auth/deviceAuth';
import { 
  HiDevicePhoneMobile, 
  HiTrash, 
  HiCheckBadge,
  HiClock,
  HiExclamationTriangle,
  HiXMark
} from 'react-icons/hi2';
import Logger from '@/lib/utils/logger';

interface DeviceManagementProps {
  userId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function DeviceManagement({ userId, isOpen, onClose }: DeviceManagementProps) {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [_isLoading, _setIsLoading] = useState<boolean>(false);
  const [removingDeviceId, setRemovingDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  const loadDevices = useCallback(() => {
    try {
      const deviceList = getRegisteredDevices(userId);
      setDevices(deviceList);
      Logger.log('Device list loaded', { deviceCount: deviceList.length });
    } catch (error) {
      Logger.error('Failed to load devices', error);
      setError('デバイス一覧の読み込みに失敗しました');
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      loadDevices();
    }
  }, [isOpen, loadDevices]);

  const handleRemoveDevice = async (deviceId: string, deviceName: string) => {
    if (!confirm(`「${deviceName}」を削除しますか？\nこのデバイスからはアクセスできなくなります。`)) {
      return;
    }

    setRemovingDeviceId(deviceId);
    setError('');
    
    try {
      const success = removeDevice(deviceId, userId);
      if (success) {
        Logger.log('Device removed successfully', { deviceId: deviceId.substring(0, 8) + '...' });
        loadDevices(); // リストを再読み込み
      } else {
        setError('デバイスの削除に失敗しました');
      }
    } catch (error) {
      Logger.error('Failed to remove device', error);
      setError('デバイスの削除でエラーが発生しました');
    } finally {
      setRemovingDeviceId(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysAgo = (timestamp: number) => {
    const daysAgo = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
    if (daysAgo === 0) return '今日';
    if (daysAgo === 1) return '昨日';
    return `${daysAgo}日前`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <HiDevicePhoneMobile className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">登録済みデバイス管理</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <HiXMark className="w-5 h-5 text-white/70 hover:text-white" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto max-h-96">
          {error && (
            <div className="mb-4 bg-red-500/20 border border-red-500/30 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <HiExclamationTriangle className="w-5 h-5 text-red-400" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="mb-4">
            <p className="text-slate-300 text-sm">
              登録されているデバイス: {devices.length}/10台
            </p>
            <p className="text-slate-400 text-xs mt-1">
              セキュリティのため、不要なデバイスは定期的に削除することをお勧めします。
            </p>
          </div>

          {devices.length === 0 ? (
            <div className="text-center py-8">
              <HiDevicePhoneMobile className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-400">登録されているデバイスがありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className={`bg-white/5 border rounded-xl p-4 transition-all duration-200 ${
                    device.isCurrentDevice 
                      ? 'border-emerald-500/50 bg-emerald-500/10' 
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <HiDevicePhoneMobile className={`w-5 h-5 ${
                          device.isCurrentDevice ? 'text-emerald-400' : 'text-slate-400'
                        }`} />
                        <h3 className="font-semibold text-white">{device.name}</h3>
                        {device.isCurrentDevice && (
                          <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-1 rounded-full border border-emerald-500/30">
                            <HiCheckBadge className="w-3 h-3 inline mr-1" />
                            現在のデバイス
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-slate-300">
                          <HiClock className="w-4 h-4" />
                          <span>登録日: {formatDate(device.registeredAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <HiClock className="w-4 h-4" />
                          <span>最終使用: {getDaysAgo(device.lastUsedAt)} ({formatDate(device.lastUsedAt)})</span>
                        </div>
                      </div>
                    </div>

                    {!device.isCurrentDevice && (
                      <button
                        onClick={() => handleRemoveDevice(device.id, device.name)}
                        disabled={removingDeviceId === device.id}
                        className="ml-4 p-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 rounded-xl transition-all duration-200 text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="このデバイスを削除"
                      >
                        {removingDeviceId === device.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-transparent border-t-red-400"></div>
                        ) : (
                          <HiTrash className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex justify-between items-center p-6 border-t border-white/10">
          <div className="text-xs text-slate-400">
            <p>デバイスは自動的にハードウェア特性で識別されます</p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}