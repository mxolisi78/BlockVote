import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("BlockVote", async function () {

  async function deployBlockVoteFixture() {
    const { viem } = await network.connect();

    const [admin, voter1, voter2, outsider] =
      await viem.getWalletClients();

    const blockVote =
      await viem.deployContract("BlockVote");

    return {
      blockVote,
      admin,
      voter1,
      voter2,
      outsider,
    };
  }

  describe("Deployment", function () {

    it("should set the deployer as admin", async function () {

      const {
        blockVote,
        admin,
      } = await deployBlockVoteFixture();

      const contractAdmin =
        await blockVote.read.admin();

      assert.equal(
        contractAdmin.toLowerCase(),
        admin.account.address.toLowerCase()
      );
    });

  });

  describe("Candidates", function () {

    it("should allow admin to add a candidate", async function () {

      const {
        blockVote,
      } = await deployBlockVoteFixture();

      await blockVote.write.addCandidate([
        "Candidate A",
      ]);

      const candidate =
        await blockVote.read.getCandidate([1n]);

      assert.equal(candidate[0], 1n);
      assert.equal(candidate[1], "Candidate A");
      assert.equal(candidate[2], 0n);
    });

    it("should allow multiple candidates", async function () {

      const {
        blockVote,
      } = await deployBlockVoteFixture();

      await blockVote.write.addCandidate([
        "Candidate A",
      ]);

      await blockVote.write.addCandidate([
        "Candidate B",
      ]);

      const count =
        await blockVote.read.candidateCount();

      assert.equal(count, 2n);
    });

  });

  describe("Voter Registration", function () {

    it("should allow admin to register a voter", async function () {

      const {
        blockVote,
        voter1,
      } = await deployBlockVoteFixture();

      await blockVote.write.registerVoter([
        voter1.account.address,
      ]);

      const status =
        await blockVote.read.getVoterStatus([
          voter1.account.address,
        ]);

      assert.equal(status[0], true);
      assert.equal(status[1], false);
    });

    it("should reject duplicate voter registration", async function () {

      const {
        blockVote,
        voter1,
      } = await deployBlockVoteFixture();

      await blockVote.write.registerVoter([
        voter1.account.address,
      ]);

      await assert.rejects(
        blockVote.write.registerVoter([
          voter1.account.address,
        ]),
        /Voter already registered/
      );
    });

  });

  describe("Election", function () {

    it("should start the election", async function () {

      const {
        blockVote,
      } = await deployBlockVoteFixture();

      await blockVote.write.addCandidate([
        "Candidate A",
      ]);

      await blockVote.write.startElection();

      const started =
        await blockVote.read.electionStarted();

      assert.equal(started, true);
    });

    it("should not start without candidates", async function () {

      const {
        blockVote,
      } = await deployBlockVoteFixture();

      await assert.rejects(
        blockVote.write.startElection(),
        /Add candidates first/
      );
    });

  });

  describe("Voting", function () {

    it("should allow a registered voter to vote", async function () {

      const {
        blockVote,
        voter1,
      } = await deployBlockVoteFixture();

      await blockVote.write.addCandidate([
        "Candidate A",
      ]);

      await blockVote.write.registerVoter([
        voter1.account.address,
      ]);

      await blockVote.write.startElection();

      await blockVote.write.vote(
        [1n],
        {
          account: voter1.account,
        }
      );

      const candidate =
        await blockVote.read.getCandidate([1n]);

      assert.equal(candidate[2], 1n);
    });

    it("should prevent a voter from voting twice", async function () {

      const {
        blockVote,
        voter1,
      } = await deployBlockVoteFixture();

      await blockVote.write.addCandidate([
        "Candidate A",
      ]);

      await blockVote.write.registerVoter([
        voter1.account.address,
      ]);

      await blockVote.write.startElection();

      await blockVote.write.vote(
        [1n],
        {
          account: voter1.account,
        }
      );

      await assert.rejects(
        blockVote.write.vote(
          [1n],
          {
            account: voter1.account,
          }
        ),
        /You have already voted/
      );
    });

    it("should reject an unregistered voter", async function () {

      const {
        blockVote,
        outsider,
      } = await deployBlockVoteFixture();

      await blockVote.write.addCandidate([
        "Candidate A",
      ]);

      await blockVote.write.startElection();

      await assert.rejects(
        blockVote.write.vote(
          [1n],
          {
            account: outsider.account,
          }
        ),
        /You are not a registered voter/
      );
    });

    it("should reject an invalid candidate", async function () {

      const {
        blockVote,
        voter1,
      } = await deployBlockVoteFixture();

      await blockVote.write.addCandidate([
        "Candidate A",
      ]);

      await blockVote.write.registerVoter([
        voter1.account.address,
      ]);

      await blockVote.write.startElection();

      await assert.rejects(
        blockVote.write.vote(
          [999n],
          {
            account: voter1.account,
          }
        ),
        /Invalid candidate/
      );
    });

  });

  describe("Ending Election", function () {

    it("should prevent voting after election ends", async function () {

      const {
        blockVote,
        voter1,
      } = await deployBlockVoteFixture();

      await blockVote.write.addCandidate([
        "Candidate A",
      ]);

      await blockVote.write.registerVoter([
        voter1.account.address,
      ]);

      await blockVote.write.startElection();

      await blockVote.write.endElection();

      await assert.rejects(
        blockVote.write.vote(
          [1n],
          {
            account: voter1.account,
          }
        ),
        /Election has ended/
      );
    });

  });

});