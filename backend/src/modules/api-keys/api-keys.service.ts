import { createHash, randomBytes } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ApiKey } from './entities/api-key.entity';

export interface GeneratedApiKey {
  id: string;
  key: string;
  prefix: string;
  name: string;
  createdAt: Date;
}

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  async generate(workspaceId: string, userId: string, name: string): Promise<GeneratedApiKey> {
    const rawKey = `lum_${randomBytes(32).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const prefix = rawKey.slice(4, 12); // 8 chars after "lum_"

    const apiKey = this.apiKeyRepository.create({
      workspaceId,
      userId,
      name,
      keyHash,
      prefix,
    });

    const saved = await this.apiKeyRepository.save(apiKey);

    return {
      id: saved.id,
      key: rawKey,
      prefix: saved.prefix,
      name: saved.name,
      createdAt: saved.createdAt,
    };
  }

  async validate(rawKey: string): Promise<ApiKey | null> {
    if (!rawKey.startsWith('lum_')) return null;

    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.apiKeyRepository.findOne({
      where: { keyHash, revokedAt: IsNull() },
      relations: ['user', 'workspace'],
    });

    if (!apiKey) return null;

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

    // Update lastUsedAt without blocking the request
    void this.apiKeyRepository.update(apiKey.id, { lastUsedAt: new Date() });

    return apiKey;
  }

  async list(workspaceId: string): Promise<ApiKey[]> {
    return this.apiKeyRepository.find({
      where: { workspaceId, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async revoke(id: string, workspaceId: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id, workspaceId, revokedAt: IsNull() },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.apiKeyRepository.update(id, { revokedAt: new Date() });
  }
}
