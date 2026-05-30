import { prisma } from "@/lib/db";

export const DEFAULT_SETTINGS = {
  lateDeductionAmount: "15000",
  leaveFreeDays: "2",
  leaveDeductionAmount: "100000",
  smtpHost: "",
  smtpPort: "587",
  smtpUser: "",
  smtpPass: "",
  smtpFrom: "Bimba Payroll <payroll@bimba.local>"
} as const;

export type SettingKey = keyof typeof DEFAULT_SETTINGS;
export type SettingsMap = Record<SettingKey, string>;

export async function getSettingsMap(): Promise<SettingsMap> {
  const rows = await prisma.appSetting.findMany();
  const settings: SettingsMap = { ...DEFAULT_SETTINGS };

  for (const row of rows) {
    if (row.key in settings) {
      settings[row.key as SettingKey] = row.value;
    }
  }

  return settings;
}

export async function upsertSettings(values: Partial<SettingsMap>, updatedBy?: string) {
  const entries = Object.entries(values).filter(([key]) => key in DEFAULT_SETTINGS) as Array<[SettingKey, string]>;

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.appSetting.upsert({
        where: { key },
        update: {
          value,
          updatedBy
        },
        create: {
          key,
          value,
          updatedBy
        }
      })
    )
  );
}

export function settingNumber(settings: SettingsMap, key: SettingKey) {
  const value = Number(settings[key]);
  const fallback = Number(DEFAULT_SETTINGS[key]);
  return Number.isFinite(value) ? value : fallback;
}
