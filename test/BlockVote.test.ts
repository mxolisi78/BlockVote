import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("BlockVote", async function () {

  async function deployBlockVoteFixture() {
    const { viem } = await network.create();

    const [admin, voter1, voter2] =
      await viem.getWalletClients();

    const blockVote = await viem.deployContract(
      "BlockVote",
      ["Student Council Election 2026"]
    );

    return {
      blockVote,
      admin,
      voter1,
      voter2,
    };
  }

  // ==========================================
  // DEPLOYMENT
  // ==========================================

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

    it("should set the election name", async function () {

      const {
        blockVote,
      } = await deployBlockVoteFixture();

      const name =
        await blockVote.read.electionName();

      assert.equal(
        name,
        "Student Council Election 2026"
      );
    });

  });

  // ==========================================
  // CANDIDATES
  // ==========================================

  describe("Candidates", function () {

    it("should allow admin to add a candidate", async function () {

      const {
        blockVote,
        admin,
      } = await deployBlockVoteFixture();

      await blockVote.write.addCandidate(
        ["Candidate A"],
        {
          account: admin.account,
        }
      );

      const candidate =
        await blockVote.read.getCandidate([1n]);

      assert.equal(candidate[0], 1n);
      assert.equal(candidate[1], "Candidate A");
      assert.equal(candidate[2], 0n);
    });

    it("should allow multiple candidates", async function () {

      const {
        blockVote,
        admin,
      } = await deployBlockVoteFixture();

      await blockVote.write.addCandidate(
        ["Candidate A"],
        {
          account: admin.account,
        }
      );

      await blockVote.write.addCandidate(
        ["Candidate B"],
        {
          account: admin.account,
        }
      );

      const count =
        await blockVote.read.candidateCount();

      assert.equal(count, 2n);
    });

    it("should prevent non-admin from adding a candidate", async function () {

  const {
    blockVote,
    voter1,
  } = await deployBlockVoteFixture();

  await assert.rejects(
    blockVote.write.addCandidate(
      ["Unauthorized Candidate"],
      {
        account: voter1.account,
      }
    ),
    /Only admin can perform this action/
  );
});

it("should prevent adding candidates after election starts", async function () {

  const {
    blockVote,
    admin,
  } = await deployBlockVoteFixture();

  await blockVote.write.addCandidate(
    ["Candidate A"],
    {
      account: admin.account,
    }
  );

  await blockVote.write.startElection({
    account: admin.account,
  });

  await assert.rejects(
    blockVote.write.addCandidate(
      ["Candidate B"],
      {
        account: admin.account,
      }
    ),
    /Election already started/
  );
});

  });

  // ==========================================
  // VOTER REGISTRATION
  // ==========================================

  describe("Voter Registration", function () {

    it("should allow admin to register a voter", async function () {

      const {
        blockVote,
        admin,
        voter1,
      } = await deployBlockVoteFixture();

      await blockVote.write.registerVoter(
        [voter1.account.address],
        {
          account: admin.account,
        }
      );

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
        admin,
        voter1,
      } = await deployBlockVoteFixture();

      await blockVote.write.registerVoter(
        [voter1.account.address],
        {
          account: admin.account,
        }
      );

      await assert.rejects(
        blockVote.write.registerVoter(
          [voter1.account.address],
          {
            account: admin.account,
          }
        ),
        /Voter already registered/
      );
    });

    it("should prevent non-admin from registering a voter", async function () {

  const {
    blockVote,
    voter1,
    voter2,
  } = await deployBlockVoteFixture();

  await assert.rejects(
    blockVote.write.registerVoter(
      [voter2.account.address],
      {
        account: voter1.account,
      }
    ),
    /Only admin can perform this action/
  );
});

  });

  // ==========================================
  // ELECTION
  // ==========================================

  describe("Election", function () {

    it("should start the election", async function () {

      const {
        blockVote,
        admin,
      } = await deployBlockVoteFixture();

      await blockVote.write.addCandidate(
        ["Candidate A"],
        {
          account: admin.account,
        }
      );

      await blockVote.write.startElection({
        account: admin.account,
      });

      const started =
        await blockVote.read.electionStarted();

      assert.equal(started, true);
    });

    it("should not start without candidates", async function () {

      const {
        blockVote,
        admin,
      } = await deployBlockVoteFixture();

      await assert.rejects(
        blockVote.write.startElection({
          account: admin.account,
        }),
        /Add candidates first/
      );
    });

    it("should prevent non-admin from starting the election", async function () {

  const {
    blockVote,
    admin,
    voter1,
  } = await deployBlockVoteFixture();

  await blockVote.write.addCandidate(
    ["Candidate A"],
    {
      account: admin.account,
    }
  );

  await assert.rejects(
    blockVote.write.startElection({
      account: voter1.account,
    }),
    /Only admin can perform this action/
  );
});

  });

  // ==========================================
  // VOTING
  // ==========================================

  describe("Voting", function () {

    it("should allow a registered voter to vote", async function () {

      const {
        blockVote,
        admin,
        voter1,
      } = await deployBlockVoteFixture();

      await blockVote.write.addCandidate(
        ["Candidate A"],
        {
          account: admin.account,
        }
      );

      await blockVote.write.registerVoter(
        [voter1.account.address],
        {
          account: admin.account,
        }
      );

      await blockVote.write.startElection({
        account: admin.account,
      });

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

    it("should increase total votes after voting", async function () {

      const {
        blockVote,
        admin,
        voter1,
      } = await deployBlockVoteFixture();

      await blockVote.write.addCandidate(
        ["Candidate A"],
        {
          account: admin.account,
        }
      );

      await blockVote.write.registerVoter(
        [voter1.account.address],
        {
          account: admin.account,
        }
      );

      await blockVote.write.startElection({
        account: admin.account,
      });

      await blockVote.write.vote(
        [1n],
        {
          account: voter1.account,
        }
      );

      const totalVotes =
        await blockVote.read.totalVotes();

      assert.equal(totalVotes, 1n);
    });

    it("should prevent a voter from voting twice", async function () {

      const {
        blockVote,
        admin,
        voter1,
      } = await deployBlockVoteFixture();

      await blockVote.write.addCandidate(
        ["Candidate A"],
        {
          account: admin.account,
        }
      );

      await blockVote.write.registerVoter(
        [voter1.account.address],
        {
          account: admin.account,
        }
      );

      await blockVote.write.startElection({
        account: admin.account,
      });

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
        admin,
        voter2,
      } = await deployBlockVoteFixture();

      await blockVote.write.addCandidate(
        ["Candidate A"],
        {
          account: admin.account,
        }
      );

      await blockVote.write.startElection({
        account: admin.account,
      });

      await assert.rejects(
        blockVote.write.vote(
          [1n],
          {
            account: voter2.account,
          }
        ),
        /You are not a registered voter/
      );
    });

    it("should reject an invalid candidate", async function () {

      const {
        blockVote,
        admin,
        voter1,
      } = await deployBlockVoteFixture();

      await blockVote.write.addCandidate(
        ["Candidate A"],
        {
          account: admin.account,
        }
      );

      await blockVote.write.registerVoter(
        [voter1.account.address],
        {
          account: admin.account,
        }
      );

      await blockVote.write.startElection({
        account: admin.account,
      });

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

  // ==========================================
  // ENDING ELECTION
  // ==========================================

  describe("Ending Election", function () {

    it("should prevent voting after election ends", async function () {

      const {
        blockVote,
        admin,
        voter1,
      } = await deployBlockVoteFixture();

      await blockVote.write.addCandidate(
        ["Candidate A"],
        {
          account: admin.account,
        }
      );

      await blockVote.write.registerVoter(
        [voter1.account.address],
        {
          account: admin.account,
        }
      );

      await blockVote.write.startElection({
        account: admin.account,
      });

      await blockVote.write.endElection({
        account: admin.account,
      });

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

    it("should prevent non-admin from ending the election", async function () {

  const {
    blockVote,
    admin,
    voter1,
  } = await deployBlockVoteFixture();

  await blockVote.write.addCandidate(
    ["Candidate A"],
    {
      account: admin.account,
    }
  );

  await blockVote.write.startElection({
    account: admin.account,
  });

  await assert.rejects(
    blockVote.write.endElection({
      account: voter1.account,
    }),
    /Only admin can perform this action/
  );
});

it("should prevent ending the election before it starts", async function () {

  const {
    blockVote,
    admin,
  } = await deployBlockVoteFixture();

  await blockVote.write.addCandidate(
    ["Candidate A"],
    {
      account: admin.account,
    }
  );

  await assert.rejects(
    blockVote.write.endElection({
      account: admin.account,
    }),
    /Election has not started/
  );
});

it("should prevent starting the election twice", async function () {

  const {
    blockVote,
    admin,
  } = await deployBlockVoteFixture();

  await blockVote.write.addCandidate(
    ["Candidate A"],
    {
      account: admin.account,
    }
  );

  await blockVote.write.startElection({
    account: admin.account,
  });

  await assert.rejects(
    blockVote.write.startElection({
      account: admin.account,
    }),
    /Election already started/
  );
});

it("should prevent ending the election twice", async function () {

  const {
    blockVote,
    admin,
  } = await deployBlockVoteFixture();

  await blockVote.write.addCandidate(
    ["Candidate A"],
    {
      account: admin.account,
    }
  );

  await blockVote.write.startElection({
    account: admin.account,
  });

  await blockVote.write.endElection({
    account: admin.account,
  });

  await assert.rejects(
    blockVote.write.endElection({
      account: admin.account,
    }),
    /Election already ended/
  );
});



  });

});