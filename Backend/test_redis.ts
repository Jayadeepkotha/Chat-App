
import redisClient, { connectRedis } from './src/config/redis';

async function test() {
    try {
        await connectRedis();
        console.log('Redis Connected!');

        await redisClient.set('test_key', 'hello_world');
        const val = await redisClient.get('test_key');
        console.log('GET test_key:', val);

        await redisClient.zAdd('queue:test', { score: Date.now(), value: 'user_1' });
        const list = await redisClient.zRange('queue:test', 0, -1);
        console.log('zRange queue:test:', list);

        if (val === 'hello_world' && list.includes('user_1')) {
            console.log('✅ REDIS IS WORKING PERFECTLY');
            process.exit(0);
        } else {
            console.log('❌ REDIS DATA MISMATCH');
            process.exit(1);
        }

    } catch (err) {
        console.error('❌ REDIS ERROR:', err);
        process.exit(1);
    }
}

test();
