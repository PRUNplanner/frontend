import { apiService } from "@/lib/apiService";
import { describe, it, expect, beforeAll } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import AxiosMockAdapter from "axios-mock-adapter";
import axiosSetup from "@/util/axiosSetup";

import { useAPIKeys } from "@/features/api_keys/useAPIKeys";

// mock apiService client
const mock = new AxiosMockAdapter(apiService.client);

describe("useAPIKeys", async () => {
	beforeAll(() => {
		setActivePinia(createPinia());
		axiosSetup();
	});

	it("composable setup", () => {
		const { loaded, apiKeyData, inDeletionId, lastCreatedKey } =
			useAPIKeys();

		expect(loaded.value).toBeFalsy();
		expect(apiKeyData.value).toBeNull();
		expect(inDeletionId.value).toBeNull();
		expect(lastCreatedKey.value).toBeNull();
	});

	it("fetchAPIKeys", async () => {
		const mockData = [
			{
				id: "foo",
				name: "foo",
				prefix: "foo",
				scope: "read",
				created: new Date(),
				last_used: new Date(),
			},
			{
				id: "moo",
				name: "moo",
				prefix: "moo",
				scope: "read_write",
				created: new Date(),
				last_used: null,
			},
		];

		mock.onGet("/user/api/keys/").reply(200, mockData);

		const { loaded, apiKeyData, fetchAPIKeys } = useAPIKeys();

		await fetchAPIKeys();

		expect(loaded.value).toBeTruthy();
		expect(apiKeyData.value?.length).toBe(mockData.length);
	});

	it("createAPIKey", async () => {
		const mockData = [
			{
				id: "foo",
				name: "foo",
				prefix: "foo",
				scope: "read",
				created: new Date(),
				last_used: new Date(),
			},
			{
				id: "moo",
				name: "moo",
				prefix: "moo",
				scope: "read_write",
				created: new Date(),
				last_used: null,
			},
		];

		const mockCreateData = {
			id: "foo",
			name: "foo",
			api_key: "foo",
			prefix: "foo",
			scope: "read_write",
		};

		mock.onGet("/user/api/keys/").reply(200, mockData);
		mock.onPost("/user/api/keys/").reply(200, mockCreateData);

		const {
			loaded,
			apiKeyData,
			createAPIKey,
			lastCreatedKey,
			lastCreatedScope,
			resetCreation,
		} = useAPIKeys();

		const result = await createAPIKey("foo", "read_write");

		expect(result).toBeTruthy();
		expect(loaded.value).toBeTruthy();
		expect(apiKeyData.value?.length).toBe(mockData.length);
		expect(lastCreatedKey.value).toBe(mockCreateData.api_key);
		expect(lastCreatedScope.value).toBe("read_write");
		expect(JSON.parse(mock.history.post.at(-1)!.data).scope).toBe(
			"read_write"
		);

		resetCreation();
		expect(lastCreatedScope.value).toBeNull();
	});

	it("createAPIKey: failure", async () => {
		mock.onPost("/user/api/keys/").reply(500);

		const { loaded, apiKeyData, createAPIKey, lastCreatedKey } =
			useAPIKeys();

		const result = await createAPIKey("foo", "read");

		expect(result).toBeFalsy();
		expect(loaded.value).toBeFalsy();
		expect(apiKeyData.value).toBeNull();
		expect(lastCreatedKey.value).toBeNull();
	});

	it("resetCreation", () => {
		const { lastCreatedKey, resetCreation } = useAPIKeys();

		lastCreatedKey.value = "foo";
		expect(lastCreatedKey.value).toBe("foo");
		resetCreation();
		expect(lastCreatedKey.value).toBeNull();
	});

	it("deleteAPIKey", async () => {
		const deleteId = "moo";

		const { apiKeyData, deleteAPIKey } = useAPIKeys();

		mock.onDelete(`/user/api/keys/${deleteId}/`).reply(204);
		mock.onGet("/user/api/keys/").reply(200, []);

		expect(apiKeyData.value).toBeNull();
		await deleteAPIKey(deleteId);
		expect(apiKeyData.value).toStrictEqual([]);
	});
});
