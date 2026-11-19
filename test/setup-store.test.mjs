import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applicationDatabaseFixture,postgresUrl} from './fixtures/application-database.mjs';
import {createSetupState} from '../dist/src/state/setup.mjs';

test('setup PostgreSQL state isolates namespace, workspace and person and rejects stale writes',{skip:!postgresUrl},async t=>{
  const first=await applicationDatabaseFixture(t),second=await applicationDatabaseFixture(t);
  const a=createSetupState(first),b=createSetupState(second);await Promise.all([a.ready(),b.ready()]);
  const scope={tenantId:'workspace',userId:'alice'};
  const record={schemaVersion:1,scope,firstWin:null,installations:[]};
  assert.equal(await a.save(scope,null,record),true);
  const saved=await a.read(scope);assert.deepEqual(saved.record,record);
  for(const other of [scope,{...scope,tenantId:'other'},{...scope,userId:'bob'}])assert.equal((await b.read(other)).record,null);
  for(const other of [{...scope,tenantId:'other'},{...scope,userId:'bob'}]){
    assert.equal((await a.read(other)).record,null);
    await assert.rejects(a.save(other,null,record));
  }
  assert.equal(await a.save(scope,null,record),false);
  assert.equal(await a.save(scope,saved.version,record),true);
  assert.equal(await a.save(scope,saved.version,record),false);
  assert.deepEqual((await createSetupState(first).read(scope)).record,record,'a new service instance preserves choices');
});
